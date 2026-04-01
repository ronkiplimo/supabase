export const FALLBACK_LONG_RUNNING_STATE_THRESHOLD_MINUTES = 10
export const LOCAL_PROJECT_BLOCKING_STATE_PARAM = 'mockProjectBlockingState'

export type LocalMockProjectBlockingState =
  | 'pausing'
  | 'pausing-long-running'
  | 'restoring'
  | 'restoring-long-running'

const MS_PER_MINUTE = 60 * 1000
const LOCAL_PROJECT_BLOCKING_STATES = new Set<LocalMockProjectBlockingState>([
  'pausing',
  'pausing-long-running',
  'restoring',
  'restoring-long-running',
])

export const minutesToMilliseconds = (minutes: number) => minutes * MS_PER_MINUTE

export const getPersistedTransitionStartTime = (storageKey: string, now = Date.now()) => {
  if (typeof window === 'undefined') return now

  const existingValue = window.localStorage.getItem(storageKey)

  if (existingValue !== null) {
    const parsedStartTime = Number(existingValue)

    if (Number.isFinite(parsedStartTime) && parsedStartTime > 0) {
      return parsedStartTime
    }
  }

  window.localStorage.setItem(storageKey, String(now))
  return now
}

export const getLocalMockProjectBlockingState = (
  asPath: string
): LocalMockProjectBlockingState | null => {
  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.NODE_ENV !== 'development' &&
    process.env.NEXT_PUBLIC_ENVIRONMENT !== 'local'
  ) {
    return null
  }

  try {
    const url = new URL(asPath, 'http://localhost')
    const projectBlockingState = url.searchParams.get(LOCAL_PROJECT_BLOCKING_STATE_PARAM)

    if (
      projectBlockingState !== null &&
      LOCAL_PROJECT_BLOCKING_STATES.has(projectBlockingState as LocalMockProjectBlockingState)
    ) {
      return projectBlockingState as LocalMockProjectBlockingState
    }
  } catch {
    return null
  }

  return null
}

export const isLongRunningProjectBlockingState = (
  projectBlockingState: LocalMockProjectBlockingState | null
) => projectBlockingState?.endsWith('-long-running') ?? false

export const clearPersistedTransitionStartTime = (storageKey: string) => {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(storageKey)
}

export const getRemainingTransitionTimeMs = ({
  startTimeMs,
  thresholdMs,
  now = Date.now(),
}: {
  startTimeMs: number
  thresholdMs: number
  now?: number
}) => {
  const elapsedMs = now - startTimeMs
  return Math.max(thresholdMs - elapsedMs, 0)
}
