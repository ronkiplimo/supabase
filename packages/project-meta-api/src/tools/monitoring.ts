import { tool } from 'ai'
import { z } from 'zod'
import { getToolContext } from './context.js'

const SUPABASE_API_URL = process.env.SUPABASE_API_URL ?? 'https://api.supabase.com'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? null
const DEFAULT_LOGS_RANGE_MS = 60 * 60 * 1000

function resolveLogsDateRange(start?: string, end?: string) {
  const now = new Date()

  return {
    start: start && start.length > 0 ? start : new Date(now.getTime() - DEFAULT_LOGS_RANGE_MS).toISOString(),
    end: end && end.length > 0 ? end : now.toISOString(),
  }
}

function resolveManagementApiAuthToken(userToken?: string | null): string | null {
  const normalized = userToken?.trim() || null

  if (normalized && SERVICE_ROLE_KEY && normalized === SERVICE_ROLE_KEY) {
    return SUPABASE_ACCESS_TOKEN
  }

  return normalized ?? SUPABASE_ACCESS_TOKEN
}

export const monitoringTools = {
  executeLogsQuery: tool({
    description: `Execute a SQL query against project logs via the Supabase Analytics API (BigQuery SQL dialect).

Available log tables: edge_logs, function_logs, function_edge_logs, postgres_logs, auth_logs, realtime_logs, storage_logs.

IMPORTANT — nested fields require unnesting. Log metadata is stored as arrays; you must cross join unnest() each level before selecting nested fields. Do NOT select top-level columns like "message" or "method" — they don't exist at the root.

Example — postgres_logs:
  select datetime(timestamp) as ts, p.error_severity, p.user_name, p.query
  from postgres_logs as t
  cross join unnest(t.metadata) as m
  cross join unnest(m.parsed) as p
  order by timestamp desc
  limit 25

Example — edge_logs (API requests):
  select datetime(timestamp) as ts, r.method, r.path, res.status_code
  from edge_logs as t
  cross join unnest(t.metadata) as m
  cross join unnest(m.request) as r
  cross join unnest(m.response) as res
  order by timestamp desc
  limit 25

Example — function_edge_logs:
  select id, function_edge_logs.timestamp, event_message, response.status_code, request.method, m.function_id, m.execution_time_ms, m.deployment_id, m.version
  from function_edge_logs
  cross join unnest(metadata) as m
  cross join unnest(m.response) as response
  cross join unnest(m.request) as request
  order by timestamp desc
  limit 100

Example — postgres_logs with parsed details:
  select identifier, postgres_logs.timestamp, id, event_message, parsed.error_severity, parsed.detail, parsed.hint
  from postgres_logs
  cross join unnest(metadata) as m
  cross join unnest(m.parsed) as parsed
  order by timestamp desc
  limit 100

Example — edge_logs with request search params:
  select id, identifier, timestamp, event_message, request.method, request.path, request.search, response.status_code
  from edge_logs
  cross join unnest(metadata) as m
  cross join unnest(m.request) as request
  cross join unnest(m.response) as response
  order by timestamp desc
  limit 100

Example — auth_logs:
  select datetime(timestamp) as ts, p.level, p.msg
  from auth_logs as t
  cross join unnest(t.metadata) as m
  cross join unnest(m.parsed) as p
  order by timestamp desc
  limit 25

Timestamp filtering: prefer iso_timestamp_start/iso_timestamp_end params over SQL WHERE on timestamp. Max range is 24h. If omitted, the tool defaults to the last hour through now.
Always include ORDER BY timestamp DESC and a LIMIT (max 1000).

When the user should also inspect or rerun the logs SQL themselves, first execute the query with this tool to inspect the results, then call renderSql with the same logs SQL and date range so both the assistant and user can interpret the same query output.`,
    inputSchema: z.object({
      sql: z.string().optional().describe('BigQuery SQL query. Use cross join unnest() to access nested metadata fields. Do not filter by timestamp in SQL — use iso_timestamp_start/iso_timestamp_end params instead.'),
      iso_timestamp_start: z.string().optional().describe('Optional ISO-8601 start timestamp (e.g. "2025-01-15T00:00:00Z"). If omitted, defaults to one hour before iso_timestamp_end or now.'),
      iso_timestamp_end: z.string().optional().describe('Optional ISO-8601 end timestamp. If omitted, defaults to now. Range max 24h.'),
    }),
    execute: async ({ sql: sqlQuery, iso_timestamp_start, iso_timestamp_end }) => {
      const ctx = getToolContext()
      if (!ctx.projectRef) return { error: 'Project ref is not available' }
      const authToken = resolveManagementApiAuthToken(ctx.userToken)
      if (!authToken) {
        return {
          error:
            'No auth token available for logs query. Provide a user token or set SUPABASE_ACCESS_TOKEN for background runners.',
        }
      }
      const resolvedDateRange = resolveLogsDateRange(iso_timestamp_start, iso_timestamp_end)
      const params = new URLSearchParams()
      if (sqlQuery) params.set('sql', sqlQuery)
      params.set('iso_timestamp_start', resolvedDateRange.start)
      params.set('iso_timestamp_end', resolvedDateRange.end)
      const qs = params.toString()
      const url = `${SUPABASE_API_URL}/v1/projects/${ctx.projectRef}/analytics/endpoints/logs.all${qs ? `?${qs}` : ''}`
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } })
      if (!resp.ok) return { error: `Logs API error (HTTP ${resp.status}): ${await resp.text()}` }
      const data = await resp.json() as { result?: unknown[]; error?: unknown }
      if (data.error) return { error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error) }
      return { rows: data.result ?? [], count: (data.result ?? []).length }
    },
  }),

  getDiskUtilization: tool({
    description: 'Get project disk attributes and utilization from the Supabase Management API.',
    inputSchema: z.object({}),
    execute: async () => {
      const ctx = getToolContext()
      if (!ctx.projectRef) return { error: 'Project ref is not available' }
      const authToken = resolveManagementApiAuthToken(ctx.userToken)
      if (!authToken) {
        return {
          error:
            'No auth token available for disk utilization query. Provide a user token or set SUPABASE_ACCESS_TOKEN for background runners.',
        }
      }
      const headers = { Authorization: `Bearer ${authToken}` }
      const [attrResp, utilResp] = await Promise.all([
        fetch(`${SUPABASE_API_URL}/v1/projects/${ctx.projectRef}/config/disk`, { headers }),
        fetch(`${SUPABASE_API_URL}/v1/projects/${ctx.projectRef}/config/disk/util`, { headers }),
      ])
      if (!attrResp.ok) return { error: `Disk attributes error (HTTP ${attrResp.status})` }
      if (!utilResp.ok) return { error: `Disk utilization error (HTTP ${utilResp.status})` }
      const attr = await attrResp.json() as { attributes?: { size_gb?: number; iops?: number; type?: string }; last_modified_at?: string }
      const util = await utilResp.json() as { metrics?: { fs_size_bytes?: number; fs_used_bytes?: number; fs_avail_bytes?: number } }
      const sizeBytes = (attr.attributes?.size_gb ?? 0) * 1024 ** 3
      const used = util.metrics?.fs_used_bytes ?? null
      const avail = util.metrics?.fs_avail_bytes ?? null
      return {
        attributes: attr.attributes,
        utilization_percent: sizeBytes && used !== null ? +((used / sizeBytes) * 100).toFixed(2) : null,
        fs_size_bytes: sizeBytes || null,
        fs_used_bytes: used,
        fs_avail_bytes: avail,
      }
    },
  }),
}
