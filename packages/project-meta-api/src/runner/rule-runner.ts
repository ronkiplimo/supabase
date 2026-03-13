import { sql, executeProjectQuery } from '../db.js'
import { insertAlertMessage } from '../chat/trigger-alert-mention.js'

type Rule = {
  id: string
  user_id: string
  title: string
  description: string
  default_message: string | null
  sql_query: string | null
  edge_function_name: string | null
  schedule: string
  enabled: boolean
}

// Port of project_meta.cron_interval_seconds() from the prototype schema.
// Returns estimated seconds between cron executions; used to detect whether
// an existing alert thread is still "fresh" (within 1.5× the interval).
function cronIntervalSeconds(schedule: string): number {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length < 5) return 86400

  const [minute, hour, dom, , month] = parts

  if (/^\*\/\d+$/.test(minute)) return parseInt(minute.slice(2)) * 60
  if (/^\*\/\d+$/.test(hour)) return parseInt(hour.slice(2)) * 3600
  if (minute !== '*' && hour === '*') return 3600
  if (minute !== '*' && hour !== '*' && dom === '*') return 86400
  if (minute !== '*' && hour !== '*' && dom !== '*' && month === '*') return 86400 * 30

  return 86400
}

export async function runRule(ruleId: string): Promise<void> {
  console.log(`[rule-runner] starting rule ${ruleId}`)

  const [rule] = (await sql`
    SELECT * FROM project_meta.rules WHERE id = ${ruleId} AND enabled = true
  `) as Rule[]

  if (!rule) {
    console.warn(`[rule-runner] rule ${ruleId} not found or disabled`)
    return
  }

  console.log(`[rule-runner] rule "${rule.title}" (${ruleId}) — type: ${rule.sql_query ? 'sql' : 'edge_function'}, schedule: ${rule.schedule}`)

  if (rule.sql_query) {
    console.log(`[rule-runner] rule "${rule.title}" executing SQL: ${rule.sql_query.slice(0, 200)}`)
    let rows: Record<string, unknown>[] = []
    try {
      rows = await executeProjectQuery(rule.sql_query)
    } catch (err) {
      console.error(`[rule-runner] rule "${rule.title}" SQL error:`, err)
      return
    }

    console.log(`[rule-runner] rule "${rule.title}" SQL returned ${rows.length} row(s)`)

    if (rows.length === 0) {
      console.log(`[rule-runner] rule "${rule.title}" — no rows returned, no alert created`)
      return
    }

    // Check for an existing unresolved thread for this rule whose most
    // recent alert is within 1.5× the cron interval — thread into it.
    const intervalMs = cronIntervalSeconds(rule.schedule) * 1500 // 1.5× in ms
    const cutoff = new Date(Date.now() - intervalMs)

    const [parentAlert] = await sql`
      SELECT a.id FROM project_meta.alerts a
      WHERE a.rule_id = ${ruleId}
        AND a.parent_alert_id IS NULL
        AND a.resolved_at IS NULL
        AND (
          SELECT MAX(created_at) FROM project_meta.alerts
          WHERE id = a.id OR parent_alert_id = a.id
        ) > ${cutoff.toISOString()}
      ORDER BY a.created_at DESC
      LIMIT 1
    `

    const message = `${rule.description}\n\nQuery results:\n\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\``

    const [newAlert] = await sql`
      INSERT INTO project_meta.alerts (parent_alert_id, rule_id, title, message, severity, metadata)
      VALUES (
        ${parentAlert?.id ?? null},
        ${ruleId},
        ${rule.title},
        ${message},
        'warning',
        ${sql.json({ rule_id: ruleId, query_results: rows } as any)}
      )
      RETURNING id
    `

    console.log(
      `[rule-runner] rule "${rule.title}" fired — ${rows.length} row(s), ` +
        (parentAlert ? `threaded under alert ${parentAlert.id}` : 'new alert thread')
    )

    // Bootstrap the alert thread with the rule's default_message (mirrors the
    // prototype's create_alert_default_message trigger). If the message contains
    // an @AgentName mention, the agent will automatically respond.
    if (newAlert && !parentAlert && rule.default_message?.trim()) {
      const messageId = `msg-${crypto.randomUUID().replace(/-/g, '')}`
      await insertAlertMessage({
        id: messageId,
        alertId: newAlert.id as string,
        userId: rule.user_id,
        content: rule.default_message,
      })
    }
  } else if (rule.edge_function_name) {
    // Edge function rules require the hosted Supabase stack (pg_net).
    // Log a warning — this could be wired up via HTTP if needed later.
    console.warn(
      `[rule-runner] rule "${rule.title}" uses edge_function_name which is not supported in self-hosted mode`
    )
  }
}
