import { useQuery } from '@tanstack/react-query'

import { jitDbAccessKeys } from './keys'
import type { JitDbAccessUnavailableReason } from '@/components/interfaces/Settings/Database/JitDatabaseAccess/JitDbAccess.types'
import { get, handleError } from '@/data/fetchers'
import type { ResponseError, UseCustomQueryOptions } from '@/types'

type JitDbAccessVariables = { projectRef?: string }

const MANUAL_MIGRATION_ERROR_PATTERNS = ['must be migrated']

const POSTGRES_UPGRADE_ERROR_PATTERNS = ['must be upgraded to postgres 17']

function messageIncludesAny(message: string, patterns: string[]) {
  return patterns.some((pattern) => message.includes(pattern))
}

function getUnavailableReason(message?: string): JitDbAccessUnavailableReason {
  const normalizedMessage = message?.toLowerCase() ?? ''

  if (messageIncludesAny(normalizedMessage, MANUAL_MIGRATION_ERROR_PATTERNS)) {
    return 'manual_migration_required'
  }

  if (messageIncludesAny(normalizedMessage, POSTGRES_UPGRADE_ERROR_PATTERNS)) {
    return 'postgres_upgrade_required'
  }

  return 'temporarily_unavailable'
}

function createUnavailableState(message?: string) {
  return {
    appliedSuccessfully: false,
    state: 'unavailable' as const,
    isUnavailable: true,
    unavailableReason: getUnavailableReason(message),
    unavailableMessage: message,
  }
}

async function getJitDbAccessConfiguration(
  { projectRef }: JitDbAccessVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')

  const { data, error } = await get(`/v1/projects/{ref}/jit-access`, {
    params: { path: { ref: projectRef } },
    signal,
  })

  // jit access might not be available on the project due to
  // postgres version
  if (error) {
    const responseError = error as ResponseError
    const normalizedMessage = responseError.message?.toLowerCase() ?? ''
    const isNotAvailableError =
      responseError.code === 400 &&
      messageIncludesAny(normalizedMessage, [
        ...MANUAL_MIGRATION_ERROR_PATTERNS,
        ...POSTGRES_UPGRADE_ERROR_PATTERNS,
      ])

    if (isNotAvailableError) {
      return createUnavailableState(responseError.message)
    } else {
      handleError(error)
    }
  }

  if (data?.state === 'unavailable') {
    return createUnavailableState()
  }

  return data
}

type JitDbAccessData = Awaited<ReturnType<typeof getJitDbAccessConfiguration>>

export const useJitDbAccessQuery = <TData = JitDbAccessData>(
  { projectRef }: JitDbAccessVariables,
  { enabled = true, ...options }: UseCustomQueryOptions<JitDbAccessData, ResponseError, TData> = {}
) =>
  useQuery<JitDbAccessData, ResponseError, TData>({
    queryKey: jitDbAccessKeys.list(projectRef),
    queryFn: ({ signal }) => getJitDbAccessConfiguration({ projectRef }, signal),
    enabled: enabled && typeof projectRef !== 'undefined',
    ...options,
  })
