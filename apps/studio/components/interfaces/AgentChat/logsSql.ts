import { resolveLogDateRange } from 'components/interfaces/Settings/Logs/logsDateRange'
import { get } from 'data/fetchers'

type LogsSqlDateRange = {
  from?: string
  to?: string
}

interface RunAgentLogsSqlQueryParams {
  projectRef: string
  sql: string
  dateRange: LogsSqlDateRange
  signal?: AbortSignal
}

export function resolveAgentLogsDateRange(dateRange: LogsSqlDateRange) {
  return resolveLogDateRange({
    from: dateRange.from ?? '',
    to: dateRange.to ?? '',
    isHelper: false,
  })
}

export async function runAgentLogsSqlQuery({
  projectRef,
  sql,
  dateRange,
  signal,
}: RunAgentLogsSqlQueryParams) {
  const resolvedDateRange = resolveAgentLogsDateRange(dateRange)

  return {
    ...(await get('/platform/projects/{ref}/analytics/endpoints/logs.all', {
      params: {
        path: { ref: projectRef },
        query: {
          sql,
          iso_timestamp_start: resolvedDateRange.from,
          iso_timestamp_end: resolvedDateRange.to,
        },
      },
      signal,
    })),
    resolvedDateRange,
  }
}
