import { tool } from 'ai'
import { z } from 'zod'
import { sql } from '../db.js'
import { getToolContext } from './context.js'

// postgres driver requires explicit json() wrapping for object values
const jsonParam = (v: unknown) => sql.json(v as any)

async function resolveAgentId(opts: {
  requestedAgentId?: string
  currentAgentId?: string
  userId?: string
}): Promise<string | null> {
  if (opts.requestedAgentId?.trim()) return opts.requestedAgentId.trim()
  if (opts.currentAgentId?.trim()) return opts.currentAgentId.trim()
  if (!opts.userId?.trim()) return null
  const [row] = await sql`
    SELECT agent_id FROM project_meta.agent_tasks
    WHERE user_id = ${opts.userId}
    ORDER BY updated_at DESC, created_at DESC LIMIT 1
  `
  return row?.agent_id ? String(row.agent_id) : null
}

export const agentTools = {
  listAgents: tool({
    description: 'List all available agents.',
    inputSchema: z.object({}),
    execute: async () => {
      const rows = await sql`SELECT id, name, summary, system_prompt, tools, created_at, updated_at FROM project_meta.agents ORDER BY name`
      return { agents: rows }
    },
  }),

  createAlert: tool({
    description: 'Create an alert to flag a health, performance, or security issue.',
    inputSchema: z.object({
      title: z.string().min(1).describe('Short title summarising the alert.'),
      message: z.string().optional().describe('Detailed description of the alert.'),
      severity: z.enum(['info', 'warning', 'error', 'critical']).optional().describe('Alert severity. Defaults to info.'),
      agent_id: z.string().uuid().optional().describe('ID of the agent raising the alert.'),
      parent_alert_id: z.string().uuid().optional().describe('Parent alert to thread this alert under.'),
      conversation_message_id: z.string().optional().describe('ID of the conversation message that triggered the alert.'),
      rule_id: z.string().uuid().optional().describe('ID of the rule that triggered the alert.'),
      metadata: z.record(z.string(), z.any()).optional().describe('Arbitrary key-value metadata.'),
    }),
    execute: async ({ title, message, severity, agent_id, parent_alert_id, conversation_message_id, rule_id, metadata }) => {
      const ctx = getToolContext()
      const [row] = await sql`
        INSERT INTO project_meta.alerts (title, message, severity, agent_id, parent_alert_id, conversation_message_id, rule_id, user_id, metadata)
        VALUES (${title}, ${message ?? null}, ${severity ?? 'info'}, ${agent_id ?? null}, ${parent_alert_id ?? null}, ${conversation_message_id ?? null}, ${rule_id ?? null}, ${ctx.userId ?? null}, ${jsonParam(metadata ?? {})})
        RETURNING id, title, severity, created_at
      `
      return { alert: row, message: `Created alert "${row.title}" (severity: ${row.severity})` }
    },
  }),

  getAlert: tool({
    description: 'Retrieve an alert by ID, including its details and conversation messages.',
    inputSchema: z.object({
      alert_id: z.string().uuid().describe('The UUID of the alert to retrieve.'),
    }),
    execute: async ({ alert_id }) => {
      const [alert] = await sql`
        SELECT id, parent_alert_id, agent_id, user_id, severity, title, message, metadata, created_at, resolved_at
        FROM project_meta.alerts WHERE id = ${alert_id}
      `
      if (!alert) return { error: 'Alert not found' }
      const messages = await sql`
        SELECT id, role, content, agent_id, created_at FROM project_meta.alert_messages
        WHERE alert_id = ${alert_id} ORDER BY created_at ASC
      `
      return { ...alert, messages }
    },
  }),

  listAlerts: tool({
    description: 'List alerts. Optionally filter by resolved status.',
    inputSchema: z.object({
      resolved: z.boolean().optional().describe('true = only resolved, false = only unresolved, omit = all.'),
    }),
    execute: async ({ resolved }) => {
      let rows
      if (resolved === true) {
        rows = await sql`SELECT * FROM project_meta.alerts WHERE resolved_at IS NOT NULL ORDER BY created_at DESC`
      } else if (resolved === false) {
        rows = await sql`SELECT * FROM project_meta.alerts WHERE resolved_at IS NULL ORDER BY created_at DESC`
      } else {
        rows = await sql`SELECT * FROM project_meta.alerts ORDER BY created_at DESC`
      }
      return { alerts: rows }
    },
  }),

  commentOnAlert: tool({
    description: 'Add a comment to an alert. Mentioning an agent name (e.g. "@Daily Reporter") triggers an AI response.',
    inputSchema: z.object({
      alert_id: z.string().uuid().describe('The UUID of the alert to comment on.'),
      content: z.string().min(1).describe('The comment text.'),
      agent_id: z.string().uuid().optional().describe('ID of the agent posting the comment.'),
    }),
    execute: async ({ alert_id, content, agent_id }) => {
      const ctx = getToolContext()
      const [check] = await sql`SELECT id FROM project_meta.alerts WHERE id = ${alert_id}`
      if (!check) return { error: 'Alert not found' }
      const messageId = `amsg-${crypto.randomUUID().replace(/-/g, '')}`
      const role = agent_id ? 'assistant' : 'user'
      const [row] = await sql`
        INSERT INTO project_meta.alert_messages (id, alert_id, user_id, agent_id, role, content)
        VALUES (${messageId}, ${alert_id}, ${ctx.userId ?? null}, ${agent_id ?? null}, ${role}, ${content})
        RETURNING id, role, content, created_at
      `
      return { message: `Comment [${row.id}] added to alert [${alert_id}]`, comment: row }
    },
  }),

  createTask: tool({
    description: 'Create a scheduled agent task. If agent_id is omitted, uses the current agent.',
    inputSchema: z.object({
      name: z.string().min(1).describe('Name of the task.'),
      description: z.string().min(1).describe('Detailed task instructions for the agent.'),
      schedule: z.string().min(1).describe('Cron schedule expression.'),
      is_unique: z
        .boolean()
        .optional()
        .describe(
          'Whether each execution should use its own conversation. true = new conversation per run; false = reuse the task conversation linked by task_id. Defaults to false.'
        ),
      enabled: z.boolean().optional().describe('Whether the task is enabled. Defaults to true.'),
      agent_id: z.string().uuid().optional().describe('Optional agent UUID. If omitted, the current agent is used.'),
    }),
    execute: async ({ name, description, schedule, is_unique, enabled, agent_id }) => {
      const ctx = getToolContext()
      if (!ctx.userId) return { error: 'User context is required to create tasks' }
      const effectiveAgentId = await resolveAgentId({ requestedAgentId: agent_id, currentAgentId: ctx.agentId, userId: ctx.userId })
      if (!effectiveAgentId) return { error: 'Unable to resolve agent_id. Provide agent_id explicitly.' }
      const [row] = await sql`
        INSERT INTO project_meta.agent_tasks (user_id, agent_id, name, description, schedule, is_unique, enabled)
        VALUES (${ctx.userId}, ${effectiveAgentId}, ${name}, ${description}, ${schedule}, ${is_unique ?? false}, ${enabled ?? true})
        RETURNING id, user_id, agent_id, name, description, schedule, is_unique, enabled, created_at
      `
      return { task: row, message: `Created task "${row.name}" for agent [${effectiveAgentId}]` }
    },
  }),

  listTasks: tool({
    description: 'List tasks for an agent. If agent_id is omitted, uses the current agent.',
    inputSchema: z.object({
      agent_id: z.string().uuid().optional().describe('Optional agent UUID. If omitted, the current agent is used.'),
    }),
    execute: async ({ agent_id }) => {
      const ctx = getToolContext()
      if (!ctx.userId) return { error: 'User context is required to list tasks' }
      const effectiveAgentId = await resolveAgentId({ requestedAgentId: agent_id, currentAgentId: ctx.agentId, userId: ctx.userId })
      if (!effectiveAgentId) return { error: 'Unable to resolve agent_id. Provide agent_id explicitly.' }
      const rows = await sql`
        SELECT id, user_id, agent_id, name, description, schedule, is_unique, enabled, created_at, updated_at
        FROM project_meta.agent_tasks WHERE user_id = ${ctx.userId} AND agent_id = ${effectiveAgentId}
        ORDER BY updated_at DESC, created_at DESC
      `
      return { agent_id: effectiveAgentId, tasks: rows }
    },
  }),
}
