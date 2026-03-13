import { useQuery } from '@tanstack/react-query'
import { fetchGet } from 'data/fetchers'
import type { UseCustomQueryOptions } from 'types'
import { projectMetaKeys } from './keys'
import type { Rule } from './types'

export async function getRules(
  { projectRef }: { projectRef?: string },
  signal?: AbortSignal
): Promise<Rule[]> {
  if (!projectRef) throw new Error('projectRef is required')

  const response = await fetchGet(`/api/platform/project-meta/${projectRef}/rules`, {
    abortSignal: signal,
  })

  if (response.error) throw new Error(response.error.message)
  return response as Rule[]
}

export type RulesData = Awaited<ReturnType<typeof getRules>>

export const useRulesQuery = <TData = RulesData>(
  { projectRef }: { projectRef?: string },
  options: UseCustomQueryOptions<RulesData, Error, TData> = {}
) =>
  useQuery<RulesData, Error, TData>({
    queryKey: projectMetaKeys.rules(projectRef),
    queryFn: ({ signal }) => getRules({ projectRef }, signal),
    enabled: !!projectRef,
    ...options,
  })
