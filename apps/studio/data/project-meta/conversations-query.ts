import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'

import { projectMetaKeys } from './keys'

export type Conversation = {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export async function getConversations(
  { projectRef, agentId }: { projectRef?: string; agentId?: string },
  signal?: AbortSignal
): Promise<Conversation[]> {
  if (!projectRef) throw new Error('projectRef is required')
  const qs = new URLSearchParams()
  if (agentId) qs.set('agent_id', agentId)

  const response = await fetchGet(
    `/api/platform/project-meta/${projectRef}/conversations${qs.size > 0 ? `?${qs.toString()}` : ''}`,
    {
      abortSignal: signal,
    }
  )
  if (response.error) throw new Error(response.error.message)
  return response as Conversation[]
}

export type ConversationsData = Awaited<ReturnType<typeof getConversations>>

export const useConversationsQuery = <TData = ConversationsData>(
  { projectRef, agentId }: { projectRef?: string; agentId?: string },
  options: UseCustomQueryOptions<ConversationsData, Error, TData> = {}
) =>
  useQuery<ConversationsData, Error, TData>({
    queryKey: projectMetaKeys.conversations(projectRef, agentId),
    queryFn: ({ signal }) => getConversations({ projectRef, agentId }, signal),
    enabled: !!projectRef,
    ...options,
  })
