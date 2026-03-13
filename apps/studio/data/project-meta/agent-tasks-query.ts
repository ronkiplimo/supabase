import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'
import { projectMetaKeys } from './keys'
import type { AgentTask } from './types'

export async function getAgentTasks(
  { projectRef }: { projectRef?: string },
  signal?: AbortSignal
): Promise<AgentTask[]> {
  if (!projectRef) throw new Error('projectRef is required')

  const response = await fetchGet(`/api/platform/project-meta/${projectRef}/agent-tasks`, {
    abortSignal: signal,
  })

  if (response.error) throw new Error(response.error.message)
  return response as AgentTask[]
}

export type AgentTasksData = Awaited<ReturnType<typeof getAgentTasks>>

export const useAgentTasksQuery = <TData = AgentTasksData>(
  { projectRef }: { projectRef?: string },
  options: UseCustomQueryOptions<AgentTasksData, Error, TData> = {}
) =>
  useQuery<AgentTasksData, Error, TData>({
    queryKey: projectMetaKeys.tasks(projectRef),
    queryFn: ({ signal }) => getAgentTasks({ projectRef }, signal),
    enabled: !!projectRef,
    ...options,
  })
