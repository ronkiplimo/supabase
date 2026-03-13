import { sql } from '../db.js'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY

/**
 * Insert a user message into alert_messages and trigger any @AgentName
 * mentions. This is the single shared path used by both the REST API route
 * and the rule runner so that both go through identical routing logic.
 */
export async function insertAlertMessage(opts: {
  id: string
  alertId: string
  userId: string
  content: string
  authHeader?: string | null
}): Promise<Record<string, unknown>> {
  const [row] = (await sql`
    INSERT INTO project_meta.alert_messages (id, alert_id, user_id, role, content)
    VALUES (${opts.id}, ${opts.alertId}, ${opts.userId}, 'user', ${opts.content})
    RETURNING *
  `) as Record<string, unknown>[]
  triggerMentionedAgents(opts.alertId, opts.id, opts.content, opts.authHeader ?? null, opts.userId)
    .catch((err) => console.error('[alert-mention] error:', err))
  return row
}

/**
 * Detect @AgentName mentions in an alert message and trigger a chat response
 * from each mentioned agent. Fire-and-forget: call with .catch() to avoid
 * blocking the caller.
 *
 * Mirrors the prototype's `on_alert_message_mention` pg_net trigger, but runs
 * in the Node.js layer since we don't have pg_net in self-hosted mode.
 */
export async function triggerMentionedAgents(
  alertId: string,
  messageId: string,
  content: string,
  authHeader: string | null,
  userId: string | undefined,
): Promise<void> {
  if (!content.includes('@')) return

  const agents = (await sql`SELECT id, name FROM project_meta.agents`) as Array<{
    id: string
    name: string
  }>
  const mentioned = agents.filter((a) =>
    content.toLowerCase().includes(`@${a.name.toLowerCase()}`)
  )
  if (!mentioned.length) return

  const port = process.env.PORT ?? '3001'
  const chatUrl = `http://127.0.0.1:${port}/chat`
  const message = { id: messageId, role: 'user', parts: [{ type: 'text', text: content }] }

  // Fall back to service role key for background triggers (e.g. rule runner)
  const effectiveAuth = authHeader ?? (SERVICE_ROLE_KEY ? `Bearer ${SERVICE_ROLE_KEY}` : null)
  if (!effectiveAuth) {
    console.warn('[alert-mention] no auth available to trigger chat')
    return
  }

  for (const agent of mentioned) {
    try {
      const effectiveToken = effectiveAuth.replace(/^Bearer\s+/i, '')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: effectiveAuth,
        'X-User-Token': effectiveToken,
        'x-internal-no-stream': '1',
      }
      if (userId) headers['X-Agent-User-Id'] = userId

      const res = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ agent_id: agent.id, alert_id: alertId, message }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error(
          `[alert-mention] chat trigger failed for agent "${agent.name}": ${res.status} ${text}`,
        )
      } else {
        console.log(`[alert-mention] agent "${agent.name}" triggered for alert ${alertId}`)
      }
    } catch (err) {
      console.error(`[alert-mention] fetch error for agent "${agent.name}":`, err)
    }
  }
}
