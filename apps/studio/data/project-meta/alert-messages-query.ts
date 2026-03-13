import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'
import { projectMetaKeys } from './keys'
import type { AlertMessage } from './types'

export async function getAlertMessages(
  { projectRef, alertId }: { projectRef?: string; alertId?: string },
  signal?: AbortSignal
): Promise<AlertMessage[]> {
  if (!projectRef || !alertId) throw new Error('projectRef and alertId are required')

  const response = await fetchGet(`/api/platform/project-meta/${projectRef}/alerts/${alertId}/messages`, {
    abortSignal: signal,
  })

  if (response.error) throw new Error(response.error.message)
  return response as AlertMessage[]
}

export type AlertMessagesData = Awaited<ReturnType<typeof getAlertMessages>>

export const useAlertMessagesQuery = <TData = AlertMessagesData>(
  { projectRef, alertId }: { projectRef?: string; alertId?: string },
  options: UseCustomQueryOptions<AlertMessagesData, Error, TData> = {}
) =>
  useQuery<AlertMessagesData, Error, TData>({
    queryKey: projectMetaKeys.alertMessages(projectRef, alertId),
    queryFn: ({ signal }) => getAlertMessages({ projectRef, alertId }, signal),
    enabled: !!projectRef && !!alertId,
    ...options,
  })
