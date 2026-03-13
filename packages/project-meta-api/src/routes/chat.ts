import { openai } from '@ai-sdk/openai'
import {
  convertToModelMessages,
  createIdGenerator,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai'
import { Hono } from 'hono'

import { verifyAuth } from '../auth.js'
import { buildSystemPrompt } from '../chat/prompt.js'
import { allTools, clearToolContext, setToolContext } from '../tools/index.js'
import { sql } from '../db.js'

const generateMessageId = createIdGenerator({ prefix: 'msg' })

type Agent = {
  id: string
  name: string
  summary: string | null
  system_prompt: string | null
  tools: string[]
}

function filterTools(available: Record<string, unknown>, allowlist: string[]) {
  if (allowlist.length === 0) return available
  const allowed = new Set(allowlist)
  return Object.fromEntries(Object.entries(available).filter(([name]) => allowed.has(name)))
}

function isUIMessage(v: unknown): v is UIMessage {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return typeof c.id === 'string' && typeof c.role === 'string' && Array.isArray(c.parts)
}

function firstText(msg: UIMessage): string | null {
  const p = msg.parts.find((p: { type: string; text?: string }) => p.type === 'text') as
    | { type: string; text?: string }
    | undefined
  return p?.text ?? null
}

function rowsToUIMessages(
  rows: Array<{ id: string; role: string; parts: unknown; created_at: string }>
): UIMessage[] {
  return rows.map((r) => ({
    id: r.id,
    role: r.role as UIMessage['role'],
    parts: (r.parts ?? []) as UIMessage['parts'],
    createdAt: new Date(r.created_at),
  }))
}


export const chatRouter = new Hono()

chatRouter.post('/', async (c) => {
  const authHeader = c.req.header('Authorization') ?? null
  const internalNoStream = c.req.header('x-internal-no-stream') === '1'
  const projectRef = c.req.header('X-Project-Ref') ?? null
  const userToken = c.req.header('X-User-Token') ?? null

  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid JSON payload' }, 400)

  const agentIdRaw = typeof body.agent_id === 'string' ? body.agent_id.trim() : ''

  const authResult = await verifyAuth(authHeader, c.req.header('X-Agent-User-Id') ?? null)
  if (!authResult.ok) return c.json({ error: authResult.error }, authResult.status)

  const userId = authResult.context.userId
  const isServiceRole = authResult.context.mode === 'service_role'
  if (!userId && !isServiceRole)
    return c.json({ error: 'A user token is required for chat requests' }, 401)

  const conversationId: string | null = body.conversation_id || null
  const alertId: string | null = body.alert_id || null
  const taskId: string | null = body.task_id || null

  // ── Append-only mode: persist a message without invoking the LLM ────────
  if (c.req.header('x-internal-append-only') === '1') {
    if (!body.message || !isUIMessage(body.message)) {
      return c.json({ error: 'Invalid message shape for append-only mode' }, 400)
    }
    const incoming = body.message as UIMessage
    try {
      if (alertId) {
        const role = incoming.role === 'assistant' ? 'assistant' : 'user'
        await sql`
          INSERT INTO project_meta.alert_messages (id, alert_id, user_id, agent_id, role, parts)
          VALUES (${incoming.id}, ${alertId}, ${userId ?? null}, ${agentIdRaw || null}, ${role}, ${sql.json(incoming.parts)})
          ON CONFLICT (id) DO UPDATE SET
            alert_id = EXCLUDED.alert_id, user_id = EXCLUDED.user_id,
            agent_id = EXCLUDED.agent_id, role = EXCLUDED.role, parts = EXCLUDED.parts
        `
      } else if (conversationId) {
        const title = firstText(incoming)?.slice(0, 100) ?? null
        await sql`INSERT INTO project_meta.conversations (id, user_id, task_id, title) VALUES (${conversationId}, ${userId ?? null}, ${taskId ?? null}, ${title}) ON CONFLICT (id) DO NOTHING`
        await sql`
          INSERT INTO project_meta.conversation_messages (id, conversation_id, agent_id, task_id, role, parts)
          VALUES (${incoming.id}, ${conversationId}, ${incoming.role === 'assistant' ? (agentIdRaw || null) : null}, ${taskId ?? null}, ${incoming.role}, ${sql.json(incoming.parts)})
          ON CONFLICT (id) DO UPDATE SET
            conversation_id = EXCLUDED.conversation_id, agent_id = EXCLUDED.agent_id,
            task_id = EXCLUDED.task_id, role = EXCLUDED.role, parts = EXCLUDED.parts
        `
      } else {
        return c.json({ error: 'append-only mode requires alert_id or conversation_id' }, 400)
      }
      return c.json({ success: true, mode: 'append_only', message_id: incoming.id })
    } catch (err) {
      console.error('Append-only persist error:', err)
      return c.json({ error: 'Failed to persist message', details: err instanceof Error ? err.message : String(err) }, 500)
    }
  }

  if (!body.message || typeof body.message !== 'object')
    return c.json({ error: 'Request must include a message object' }, 400)

  // ── Alert path: agent_id is optional — detect from @mention if omitted ──
  let agent: Agent | null = null

  if (alertId) {
    if (agentIdRaw) {
      const [row] =
        await sql`SELECT id, name, summary, system_prompt, tools FROM project_meta.agents WHERE id = ${agentIdRaw}`
      if (!row) return c.json({ error: 'Agent not found' }, 404)
      agent = row as Agent
    } else {
      // Detect @AgentName mention in the incoming message text
      const messageText = firstText(body.message as UIMessage) ?? ''
      if (messageText.includes('@')) {
        const agentRows = (await sql`SELECT id, name, summary, system_prompt, tools FROM project_meta.agents`) as Agent[]
        for (const row of agentRows) {
          if (messageText.toLowerCase().includes(`@${row.name.toLowerCase()}`)) {
            agent = row
            break
          }
        }
      }
    }

    // Save the incoming user message as an alert_message regardless of whether an agent responds
    const incomingMessage = body.message as UIMessage
    try {
      await sql`
        INSERT INTO project_meta.alert_messages (id, alert_id, user_id, role, parts)
        VALUES (${incomingMessage.id}, ${alertId}, ${userId ?? null}, 'user', ${sql.json(incomingMessage.parts)})
        ON CONFLICT (id) DO NOTHING
      `
    } catch (err) {
      console.error('Failed to persist alert user message:', err)
    }

    // No agent mention found — plain comment, return empty event stream so useChat completes cleanly
    if (!agent) {
      return new Response(null, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    }
  } else {
    // Conversation path — agent_id is required
    if (!agentIdRaw) return c.json({ error: 'agent_id is required' }, 400)
    const [row] =
      await sql`SELECT id, name, summary, system_prompt, tools FROM project_meta.agents WHERE id = ${agentIdRaw}`
    if (!row) return c.json({ error: 'Agent not found' }, 404)
    agent = row as Agent
  }

  const modelId = typeof body.model === 'string' ? body.model : 'gpt-5-mini'
  const persistIncoming = body.persist !== false
  const incomingMessage = body.message as UIMessage

  // Load conversation history
  let previousMessages: UIMessage[] = []
  let conversationExists = false
  let resolvedTaskId = taskId

  if (alertId) {
    const msgRows = await sql`
      SELECT id, role, parts, created_at FROM project_meta.alert_messages
      WHERE alert_id = ${alertId} AND id != ${incomingMessage.id}
      ORDER BY created_at ASC
    `
    previousMessages = rowsToUIMessages(msgRows as any[])
  } else if (conversationId) {
    const convCheck =
      await sql`SELECT id, task_id FROM project_meta.conversations WHERE id = ${conversationId}`
    conversationExists = convCheck.length > 0
    if (!resolvedTaskId && conversationExists && convCheck[0].task_id)
      resolvedTaskId = String(convCheck[0].task_id)
    if (conversationExists) {
      const msgRows = await sql`
        SELECT id, role, parts, created_at FROM project_meta.conversation_messages
        WHERE conversation_id = ${conversationId} ORDER BY created_at ASC
      `
      previousMessages = rowsToUIMessages(msgRows as any[])
    }
  }

  let taskContext: {
    name: string
    description: string
    schedule: string
    is_unique: boolean
  } | null = null
  if (resolvedTaskId) {
    const [taskRow] =
      await sql`SELECT id, name, description, schedule, is_unique FROM project_meta.agent_tasks WHERE id = ${resolvedTaskId}`
    if (taskRow) taskContext = taskRow as any
  }

  let alertContext: {
    title: string
    message: string | null
    severity: string
    metadata: unknown
  } | null = null
  if (alertId) {
    const [alertRow] =
      await sql`SELECT title, message, severity, metadata FROM project_meta.alerts WHERE id = ${alertId}`
    if (alertRow) alertContext = alertRow as any
  }

  const allMessages = [...previousMessages, incomingMessage]
  let normalizedMessages
  try {
    normalizedMessages = await convertToModelMessages(allMessages as any)
  } catch {
    return c.json({ error: 'Invalid message format' }, 400)
  }

  const tools = filterTools(allTools as Record<string, unknown>, agent.tools)
  const currentTimeIso = new Date().toISOString()

  let instructions = buildSystemPrompt(agent.system_prompt, currentTimeIso)
  instructions += `\n\nCurrent agent identity:\n- Agent ID: ${agent.id}`
  instructions += [
    `\n\nCurrent time context:`,
    `- Current UTC time: ${currentTimeIso}`,
    `- Anchor all relative time windows such as "now", "today", "last 10 minutes", and "last hour" to this UTC timestamp.`,
    `- Do not invent future timestamps when generating tool inputs.`,
  ].join('\n')

  if (alertContext) {
    instructions += [
      `\n\nYou are responding to an ALERT conversation. Help the user investigate and resolve it.`,
      `Alert title: ${alertContext.title}`,
      alertContext.message ? `Alert message: ${alertContext.message}` : null,
      `Severity: ${alertContext.severity}`,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (resolvedTaskId && taskContext) {
    instructions += [
      `\n\nYou are in a TASK-INITIATED conversation. Treat this as autonomous task execution context.`,
      `The task already exists and this run was triggered by its scheduler.`,
      `Use the task description as the execution objective for this run, not as a request to create or reschedule a task.`,
      `Do not call "createTask" or create a replacement task just because the task description mentions cadence, recurrence, scheduling, or "every run".`,
      `Only create, update, disable, or replace tasks when a user explicitly asks for that in a message during this conversation.`,
      `Task: ${taskContext.name} — ${taskContext.description}`,
      `Schedule: ${taskContext.schedule}`,
    ].join('\n')
  }

  // Warn the agent when the deploy-code-agent tool is present
  if ('deploy-code-agent' in tools) {
    instructions += [
      `\n\nTool policy:`,
      `"deploy-code-agent" is a high-cost action. Only call it when the user explicitly asks for code-agent execution.`,
      `The sandbox already has repository context — do not ask the user for repo URLs or code files.`,
    ].join('\n')
  }

  instructions += [
    `\n\nResponse format policy:`,
    `Write naturally and use Markdown to make the response easy to read.`,
    `Default to one or two short paragraphs. Use short headings only when they genuinely improve readability.`,
    `Use fenced code blocks for brief illustrative code snippets only.`,
    'renderSql' in tools
      ? `If SQL should be shown for the user to run, or the SQL relates to data or logs you just retrieved, call "renderSql" instead of pasting the SQL into the message.`
      : `If you mention SQL, summarize it briefly instead of pasting large executable queries unless the user explicitly asks for the raw SQL.`,
    'executeLogsQuery' in tools && 'renderSql' in tools
      ? `For logs investigations, call "executeLogsQuery" first to inspect the results yourself, then call "renderSql" with the same logs SQL and date range so both you and the user can interpret the same query output.`
      : null,
    `When you call tools, ensure the assistant message accompanies the tool output with a short summary, explanation, or next step.`,
    `Do not repeat raw rows, logs, metrics, or other payload data that the rendered tool output already shows to the user.`,
  ]
    .filter(Boolean)
    .join('\n')

  setToolContext({
    authHeader,
    conversationId: conversationId ?? undefined,
    alertId: alertId ?? undefined,
    agentId: agent.id,
    userId,
    projectRef,
    userToken,
  })

  try {
    const result = await streamText({
      model: openai(modelId),
      messages: normalizedMessages,
      stopWhen: stepCountIs(10),
      system: instructions,
      tools: tools as any,
      onStepStart: (step) => {
        console.log(`[chat] step-start index=${step.stepType}`)
      },
      onStepFinish: (step) => {
        console.log(`[chat] step-finish reason=${step.finishReason} toolCalls=${step.toolCalls.length} toolResults=${step.toolResults.length}`)
        for (const tc of step.toolCalls) {
          console.log(`[chat]   tool-call: ${tc.toolName}`, JSON.stringify(tc.input).slice(0, 200))
        }
        for (const tr of step.toolResults) {
          const preview = JSON.stringify(tr.output).slice(0, 300)
          console.log(`[chat]   tool-result: ${tr.toolName} ok=${!tr.isError} output=${preview}`)
        }
      },
      onError: (err) => {
        console.error('[chat] streamText error:', err)
      },
    })

    const streamOptions = {
      sendReasoning: true,
      sendSources: true,
      generateMessageId,
      originalMessages: allMessages,
      onFinish: async ({ messages: finalMessages }: { messages: UIMessage[] }) => {
        try {
          const prevIds = new Set(previousMessages.map((m) => m.id))

          if (alertId) {
            const newAssistant = finalMessages.filter(
              (m) => m.role === 'assistant' && !prevIds.has(m.id)
            )

            if (newAssistant.length > 0) {
              await sql`
                INSERT INTO project_meta.alert_messages ${sql(
                  newAssistant.map((m) => ({
                    id: m.id,
                    alert_id: alertId,
                    user_id: userId ?? null,
                    agent_id: agent.id,
                    role: 'assistant' as const,
                    parts: sql.json(m.parts),
                  }))
                )}
              `
            }
          } else if (conversationId) {
            if (!conversationExists) {
              const firstMsg = finalMessages.find((m) => m.role === 'user' || m.role === 'system')
              const title = firstMsg ? firstText(firstMsg)?.slice(0, 100) ?? null : null
              await sql`INSERT INTO project_meta.conversations (id, user_id, task_id, title) VALUES (${conversationId}, ${userId ?? null}, ${resolvedTaskId ?? null}, ${title})`
            }

            const newMessages = finalMessages
              .filter((m) => !prevIds.has(m.id))
              .filter((m) => (persistIncoming ? true : m.id !== incomingMessage.id))

            if (newMessages.length > 0) {
              await sql`
                INSERT INTO project_meta.conversation_messages ${sql(
                  newMessages.map((m) => ({
                    id: m.id,
                    conversation_id: conversationId,
                    agent_id: m.role === 'assistant' ? agent.id : null,
                    task_id: resolvedTaskId ?? null,
                    role: m.role,
                    parts: sql.json(m.parts),
                  }))
                )}
                ON CONFLICT (id) DO UPDATE SET
                  conversation_id = EXCLUDED.conversation_id,
                  agent_id = EXCLUDED.agent_id,
                  task_id = EXCLUDED.task_id,
                  role = EXCLUDED.role,
                  parts = EXCLUDED.parts
              `
            }
          }
        } catch (err) {
          console.error('Error persisting messages:', err)
        }
        clearToolContext()
      },
    }

    if (internalNoStream) {
      const stream = result.toUIMessageStream(streamOptions)
      for await (const _ of stream) {
        /* drain */
      }
      return c.json({ success: true, mode: 'internal_non_stream' })
    }

    result.consumeStream()
    return result.toUIMessageStreamResponse({ ...streamOptions })
  } catch (err) {
    clearToolContext()
    console.error('Chat error:', err)
    return c.json(
      {
        error: 'Failed to process chat request',
        details: err instanceof Error ? err.message : String(err),
      },
      500
    )
  }
})
