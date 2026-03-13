import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'

import { projectMetaKeys } from './keys'
import type { AgentTask } from './types'

export async function getAgentTasksByAgent(
  { projectRef, id }: { projectRef?: string; id?: string },
  signal?: AbortSignal
): Promise<AgentTask[]> {
  if (!projectRef || !id) throw new Error('projectRef and id are required')

  const response = await fetchGet(`/api/platform/project-meta/${projectRef}/agents/${id}/tasks`, {
    abortSignal: signal,
  })

  if (response.error) throw response.error
  return response as AgentTask[]
}

export type AgentTasksByAgentData = Awaited<ReturnType<typeof getAgentTasksByAgent>>

export const useAgentTasksByAgentQuery = <TData = AgentTasksByAgentData>(
  { projectRef, id }: { projectRef?: string; id?: string },
  options: UseCustomQueryOptions<AgentTasksByAgentData, Error, TData> = {}
) =>
  useQuery<AgentTasksByAgentData, Error, TData>({
    queryKey: projectMetaKeys.agentTasks(projectRef, id),
    queryFn: ({ signal }) => getAgentTasksByAgent({ projectRef, id }, signal),
    enabled: !!projectRef && !!id,
    ...options,
  })
