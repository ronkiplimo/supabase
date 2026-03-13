import { useQuery } from '@tanstack/react-query'
import type { UIMessage } from 'ai'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'
import { projectMetaKeys } from './keys'

type MessageRow = {
  id: string
  role: string
  parts: unknown
  created_at: string
}

export async function getConversationMessages(
  { projectRef, conversationId }: { projectRef?: string; conversationId?: string },
  signal?: AbortSignal
): Promise<UIMessage[]> {
  if (!projectRef || !conversationId) throw new Error('projectRef and conversationId are required')
  const response = await fetchGet(
    `/api/platform/project-meta/${projectRef}/conversations/${conversationId}/messages`,
    { abortSignal: signal }
  )
  if (response.error) throw new Error(response.error.message)
  return (response as MessageRow[]).map((r) => ({
    id: r.id,
    role: r.role as UIMessage['role'],
    parts: (r.parts ?? []) as UIMessage['parts'],
    createdAt: new Date(r.created_at),
  }))
}

export const useConversationMessagesQuery = <TData = UIMessage[]>(
  { projectRef, conversationId }: { projectRef?: string; conversationId?: string },
  options: UseCustomQueryOptions<UIMessage[], Error, TData> = {}
) =>
  useQuery<UIMessage[], Error, TData>({
    queryKey: projectMetaKeys.conversationMessages(projectRef, conversationId),
    queryFn: ({ signal }) => getConversationMessages({ projectRef, conversationId }, signal),
    enabled: !!projectRef && !!conversationId,
    ...options,
  })
