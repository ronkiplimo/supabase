import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'

import { projectMetaKeys } from './keys'
import type { AgentLogRow } from './types'

export async function getAgentLogs(
  { projectRef, id }: { projectRef?: string; id?: string },
  signal?: AbortSignal
): Promise<AgentLogRow[]> {
  if (!projectRef || !id) throw new Error('projectRef and id are required')

  const response = await fetchGet(`/api/platform/project-meta/${projectRef}/agents/${id}/logs`, {
    abortSignal: signal,
  })

  if (response.error) throw response.error
  return response as AgentLogRow[]
}

export type AgentLogsData = Awaited<ReturnType<typeof getAgentLogs>>

export const useAgentLogsQuery = <TData = AgentLogsData>(
  { projectRef, id }: { projectRef?: string; id?: string },
  options: UseCustomQueryOptions<AgentLogsData, Error, TData> = {}
) =>
  useQuery<AgentLogsData, Error, TData>({
    queryKey: projectMetaKeys.agentLogs(projectRef, id),
    queryFn: ({ signal }) => getAgentLogs({ projectRef, id }, signal),
    enabled: !!projectRef && !!id,
    ...options,
  })
