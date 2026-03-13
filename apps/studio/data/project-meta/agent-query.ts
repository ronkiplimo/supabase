import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'

import { projectMetaKeys } from './keys'
import type { AgentDetails } from './types'

export async function getAgent(
  { projectRef, id }: { projectRef?: string; id?: string },
  signal?: AbortSignal
): Promise<AgentDetails> {
  if (!projectRef || !id) throw new Error('projectRef and id are required')

  const response = await fetchGet(`/api/platform/project-meta/${projectRef}/agents/${id}`, {
    abortSignal: signal,
  })

  if (response.error) throw response.error
  return response as AgentDetails
}

export type AgentData = Awaited<ReturnType<typeof getAgent>>

export const useAgentQuery = <TData = AgentData>(
  { projectRef, id }: { projectRef?: string; id?: string },
  options: UseCustomQueryOptions<AgentData, Error, TData> = {}
) =>
  useQuery<AgentData, Error, TData>({
    queryKey: projectMetaKeys.agent(projectRef, id),
    queryFn: ({ signal }) => getAgent({ projectRef, id }, signal),
    enabled: !!projectRef && !!id,
    ...options,
  })
