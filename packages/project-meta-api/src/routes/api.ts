import { Context, Hono } from 'hono'

import { verifyAuth } from '../auth.js'
import { insertAlertMessage } from '../chat/trigger-alert-mention.js'
import { sql } from '../db.js'

type Env = { Variables: { userId: string | undefined } }

function normalizeTools(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  )
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim().length > 0 ? value : null
}

function partsToText(parts: unknown): string {
  if (Array.isArray(parts)) {
    const text = parts
      .flatMap((part) => {
        if (!part || typeof part !== 'object') return []
        const candidate = part as { type?: unknown; text?: unknown }
        return candidate.type === 'text' && typeof candidate.text === 'string'
          ? [candidate.text.trim()]
          : []
      })
      .filter((value) => value.length > 0)
      .join('\n')

    if (text.length > 0) return text
  }

  if (typeof parts === 'string' && parts.trim().length > 0) return parts.trim()
  if (parts == null) return 'No text content'

  try {
    return JSON.stringify(parts)
  } catch {
    return 'No text content'
  }
}

export const apiRouter = new Hono<Env>()

function requireUserId(c: Context<Env>) {
  const userId = c.get('userId')

  if (!userId) {
    return {
      ok: false as const,
      response: c.json({ error: 'User context is required' }, 401),
    }
  }

  return { ok: true as const, userId }
}

async function getAgentById(id: string) {
  const [row] = await sql`SELECT * FROM project_meta.agents WHERE id = ${id}`
  return row ?? null
}

// Auth middleware — requires a user JWT or service role key
apiRouter.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return new Response('ok', { status: 200 })
  const result = await verifyAuth(
    c.req.header('Authorization') ?? null,
    c.req.header('X-Agent-User-Id') ?? null
  )
  if (!result.ok) return c.json({ error: result.error }, result.status as 401 | 500)
  c.set('userId', result.context.userId)
  await next()
})

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

apiRouter.get('/agents', async (c) => {
  const rows = await sql`SELECT * FROM project_meta.agents ORDER BY name`
  return c.json(rows)
})

apiRouter.get('/agents/:id', async (c) => {
  const id = c.req.param('id')
  const [row] = await sql`
    SELECT
      a.*,
      (
        SELECT COUNT(*)::int
        FROM project_meta.agent_tasks t
        WHERE t.agent_id = a.id
      ) AS task_count,
      (
        SELECT COUNT(*)::int
        FROM project_meta.alerts al
        WHERE al.agent_id = a.id
      ) AS alert_count,
      (
        SELECT COUNT(*)::int
        FROM project_meta.conversations conv
        WHERE
          EXISTS (
            SELECT 1
            FROM project_meta.agent_tasks task
            WHERE task.id = conv.task_id
              AND task.agent_id = a.id
          )
          OR EXISTS (
            SELECT 1
            FROM project_meta.conversation_messages message
            LEFT JOIN project_meta.agent_tasks task ON task.id = message.task_id
            WHERE message.conversation_id = conv.id
              AND (
                message.agent_id = a.id
                OR task.agent_id = a.id
              )
          )
      ) AS conversation_count,
      (
        (
          SELECT COUNT(*)::int
          FROM project_meta.conversation_messages message
          WHERE message.agent_id = a.id
        ) +
        (
          SELECT COUNT(*)::int
          FROM project_meta.alert_messages message
          WHERE message.agent_id = a.id
        )
      )::int AS message_count
    FROM project_meta.agents a
    WHERE a.id = ${id}
  `

  if (!row) return c.json({ message: 'Agent not found' }, 404)
  return c.json(row)
})

apiRouter.get('/agents/:id/tasks', async (c) => {
  const id = c.req.param('id')
  const agent = await getAgentById(id)
  if (!agent) return c.json({ message: 'Agent not found' }, 404)

  const rows = await sql`
    SELECT *
    FROM project_meta.agent_tasks
    WHERE agent_id = ${id}
    ORDER BY name
  `

  return c.json(rows)
})

apiRouter.get('/agents/:id/logs', async (c) => {
  const id = c.req.param('id')
  const agent = await getAgentById(id)
  if (!agent) return c.json({ message: 'Agent not found' }, 404)

  const conversationRows = await sql`
    SELECT
      message.id,
      message.conversation_id AS source_id,
      message.role,
      message.parts,
      message.created_at,
      COALESCE(message_task.name, conversation_task.name) AS task_name,
      conv.title AS thread_label
    FROM project_meta.conversation_messages message
    JOIN project_meta.conversations conv ON conv.id = message.conversation_id
    LEFT JOIN project_meta.agent_tasks conversation_task ON conversation_task.id = conv.task_id
    LEFT JOIN project_meta.agent_tasks message_task ON message_task.id = message.task_id
    WHERE message.agent_id = ${id}
  `

  const alertRows = await sql`
    SELECT
      message.id,
      message.alert_id AS source_id,
      message.role,
      message.content,
      message.created_at,
      alert.title AS thread_label
    FROM project_meta.alert_messages message
    JOIN project_meta.alerts alert ON alert.id = message.alert_id
    WHERE message.agent_id = ${id}
  `

  const rows = [
    ...conversationRows.map((row) => ({
      id: String(row.id),
      source: 'conversation' as const,
      source_id: String(row.source_id),
      role: row.role === 'assistant' ? 'assistant' : 'user',
      task_name: typeof row.task_name === 'string' ? row.task_name : null,
      thread_label: typeof row.thread_label === 'string' ? row.thread_label : null,
      content: partsToText(row.parts),
      created_at: String(row.created_at),
    })),
    ...alertRows.map((row) => ({
      id: String(row.id),
      source: 'alert' as const,
      source_id: String(row.source_id),
      role: row.role === 'assistant' ? 'assistant' : 'user',
      task_name: null,
      thread_label: typeof row.thread_label === 'string' ? row.thread_label : null,
      content: typeof row.content === 'string' ? row.content : 'No text content',
      created_at: String(row.created_at),
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return c.json(rows)
})

apiRouter.post('/agents', async (c) => {
  const body = await c.req.json()
  const tools = normalizeTools(body.tools)
  const [row] = await sql`
    INSERT INTO project_meta.agents (name, summary, system_prompt, tools)
    VALUES (${body.name}, ${body.summary ?? null}, ${body.system_prompt ?? null}, ${tools})
    RETURNING *
  `
  return c.json(row, 201)
})

apiRouter.patch('/agents/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const tools = normalizeTools(body.tools)
  const [row] = await sql`
    UPDATE project_meta.agents
    SET name = ${body.name},
        summary = ${body.summary ?? null},
        system_prompt = ${body.system_prompt ?? null},
        tools = ${tools}
    WHERE id = ${id}
    RETURNING *
  `
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

apiRouter.delete('/agents/:id', async (c) => {
  const id = c.req.param('id')
  await sql`DELETE FROM project_meta.agents WHERE id = ${id}`
  return c.json({ success: true })
})

// ---------------------------------------------------------------------------
// Agent Tasks (scoped to authenticated user)
// ---------------------------------------------------------------------------

apiRouter.get('/agent-tasks', async (c) => {
  const rows = await sql`SELECT * FROM project_meta.agent_tasks ORDER BY name`
  return c.json(rows)
})

apiRouter.post('/agent-tasks', async (c) => {
  const auth = requireUserId(c)
  if (!auth.ok) return auth.response

  const body = await c.req.json()
  const agentId = typeof body.agent_id === 'string' ? body.agent_id.trim() : ''
  if (!agentId) return c.json({ error: 'agent_id is required' }, 400)
  const [row] = await sql`
    INSERT INTO project_meta.agent_tasks (user_id, agent_id, name, description, schedule, is_unique, enabled)
    VALUES (${auth.userId}, ${agentId}, ${body.name}, ${body.description}, ${body.schedule}, ${body.is_unique ?? false}, ${body.enabled ?? true})
    RETURNING *
  `
  return c.json(row, 201)
})

apiRouter.patch('/agent-tasks/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const agentId = typeof body.agent_id === 'string' ? body.agent_id.trim() : ''
  if (!agentId) return c.json({ error: 'agent_id is required' }, 400)
  const [row] = await sql`
    UPDATE project_meta.agent_tasks
    SET agent_id = ${agentId}, name = ${body.name}, description = ${body.description},
        schedule = ${body.schedule}, is_unique = ${body.is_unique}, enabled = ${body.enabled}
    WHERE id = ${id}
    RETURNING *
  `
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

apiRouter.delete('/agent-tasks/:id', async (c) => {
  const id = c.req.param('id')
  const [row] = await sql`DELETE FROM project_meta.agent_tasks WHERE id = ${id} RETURNING id`
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ success: true })
})

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

apiRouter.get('/conversations', async (c) => {
  const agentId = c.req.query('agent_id')?.trim()

  const rows = agentId
    ? await sql`
        SELECT conv.id, conv.title, conv.created_at, conv.updated_at
        FROM project_meta.conversations conv
        WHERE EXISTS (
          SELECT 1
          FROM project_meta.conversation_messages message
          WHERE message.conversation_id = conv.id
            AND message.agent_id = ${agentId}
        )
        ORDER BY conv.updated_at DESC
        LIMIT 50
      `
    : await sql`
        SELECT id, title, created_at, updated_at
        FROM project_meta.conversations
        ORDER BY updated_at DESC
        LIMIT 50
      `

  return c.json(rows)
})

apiRouter.get('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id')
  const check = await sql`SELECT id FROM project_meta.conversations WHERE id = ${id}`
  if (!check.length) return c.json({ error: 'Not found' }, 404)
  const rows = await sql`
    SELECT id, role, parts, created_at FROM project_meta.conversation_messages
    WHERE conversation_id = ${id} ORDER BY created_at ASC
  `
  return c.json(rows)
})

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

apiRouter.get('/alerts', async (c) => {
  const resolved = c.req.query('resolved')
  let rows
  if (resolved === 'true') {
    rows =
      await sql`SELECT * FROM project_meta.alerts WHERE resolved_at IS NOT NULL ORDER BY created_at DESC`
  } else if (resolved === 'false') {
    rows = await sql`SELECT * FROM project_meta.alerts WHERE resolved_at IS NULL ORDER BY created_at DESC`
  } else {
    rows = await sql`SELECT * FROM project_meta.alerts ORDER BY created_at DESC`
  }
  return c.json(rows)
})

apiRouter.patch('/alerts/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const check = await sql`SELECT id FROM project_meta.alerts WHERE id = ${id}`
  if (!check.length) return c.json({ error: 'Not found' }, 404)
  const resolvedAt = body.resolved_at ?? null
  const [row] = await sql`
    UPDATE project_meta.alerts SET resolved_at = ${resolvedAt} WHERE id = ${id} RETURNING *
  `
  if (resolvedAt) {
    await sql`
      UPDATE project_meta.alerts SET resolved_at = ${resolvedAt}
      WHERE parent_alert_id = ${id} AND resolved_at IS NULL
    `
  }
  return c.json(row)
})

apiRouter.get('/alerts/:id/messages', async (c) => {
  const alertId = c.req.param('id')
  const check = await sql`SELECT id FROM project_meta.alerts WHERE id = ${alertId}`
  if (!check.length) return c.json({ error: 'Not found' }, 404)
  const rows = await sql`
    SELECT * FROM project_meta.alert_messages WHERE alert_id = ${alertId} ORDER BY created_at ASC
  `
  return c.json(rows)
})

apiRouter.post('/alerts/:id/messages', async (c) => {
  const auth = requireUserId(c)
  if (!auth.ok) return auth.response

  const alertId = c.req.param('id')
  const body = await c.req.json()
  const check = await sql`SELECT id FROM project_meta.alerts WHERE id = ${alertId}`
  if (!check.length) return c.json({ error: 'Not found' }, 404)

  const row = await insertAlertMessage({
    id: body.id,
    alertId,
    userId: auth.userId,
    content: body.content ?? '',
    authHeader: c.req.header('Authorization'),
  })

  return c.json(row, 201)
})

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

apiRouter.get('/rules', async (c) => {
  const rows = await sql`SELECT * FROM project_meta.rules ORDER BY title`
  return c.json(rows)
})

apiRouter.post('/rules', async (c) => {
  const auth = requireUserId(c)
  if (!auth.ok) return auth.response

  const body = await c.req.json()
  const defaultMessage = normalizeOptionalText(body.default_message)
  const [row] = await sql`
    INSERT INTO project_meta.rules (user_id, title, description, default_message, sql_query, edge_function_name, schedule, enabled)
    VALUES (${auth.userId}, ${body.title}, ${body.description ?? ''}, ${defaultMessage}, ${body.sql_query ?? null}, ${body.edge_function_name ?? null}, ${body.schedule}, ${body.enabled ?? true})
    RETURNING *
  `
  return c.json(row, 201)
})

apiRouter.patch('/rules/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const defaultMessage = normalizeOptionalText(body.default_message)
  const [row] = await sql`
    UPDATE project_meta.rules
    SET title = ${body.title}, description = ${body.description ?? ''},
        default_message = ${defaultMessage}, sql_query = ${body.sql_query ?? null},
        edge_function_name = ${body.edge_function_name ?? null},
        schedule = ${body.schedule}, enabled = ${body.enabled}
    WHERE id = ${id}
    RETURNING *
  `
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

apiRouter.delete('/rules/:id', async (c) => {
  const id = c.req.param('id')
  const [row] = await sql`DELETE FROM project_meta.rules WHERE id = ${id} RETURNING id`
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ success: true })
})
