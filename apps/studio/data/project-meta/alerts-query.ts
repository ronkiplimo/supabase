import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'
import { projectMetaKeys } from './keys'
import type { Alert } from './types'

type AlertFilter = boolean | 'all'

export async function getAlerts(
  { projectRef, resolved = 'all' }: { projectRef?: string; resolved?: AlertFilter },
  signal?: AbortSignal
): Promise<Alert[]> {
  if (!projectRef) throw new Error('projectRef is required')

  const searchParams = new URLSearchParams()
  if (resolved !== 'all') searchParams.set('resolved', String(resolved))
  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : ''

  const response = await fetchGet(`/api/platform/project-meta/${projectRef}/alerts${suffix}`, {
    abortSignal: signal,
  })

  if (response.error) throw new Error(response.error.message)
  return response as Alert[]
}

export type AlertsData = Awaited<ReturnType<typeof getAlerts>>

export const useAlertsQuery = <TData = AlertsData>(
  { projectRef, resolved = 'all' }: { projectRef?: string; resolved?: AlertFilter },
  options: UseCustomQueryOptions<AlertsData, Error, TData> = {}
) =>
  useQuery<AlertsData, Error, TData>({
    queryKey: projectMetaKeys.alerts(projectRef, resolved),
    queryFn: ({ signal }) => getAlerts({ projectRef, resolved }, signal),
    enabled: !!projectRef,
    ...options,
  })
