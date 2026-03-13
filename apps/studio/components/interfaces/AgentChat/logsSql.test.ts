import dayjs from 'dayjs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveAgentLogsDateRange, runAgentLogsSqlQuery } from './logsSql'

vi.mock('data/fetchers', () => ({
  get: vi.fn(),
}))

describe('resolveAgentLogsDateRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fills a missing end timestamp the same way as the logs explorer', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-13T10:00:00.000Z')
    vi.setSystemTime(now)

    const range = resolveAgentLogsDateRange({
      from: '2026-03-13T09:50:00.000Z',
    })

    expect(range).toEqual({
      from: '2026-03-13T09:50:00.000Z',
      to: dayjs(now).toISOString(),
    })
  })
})

describe('runAgentLogsSqlQuery', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('calls the same logs endpoint with normalized query params', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-13T10:00:00.000Z')
    vi.setSystemTime(now)

    const { get } = await import('data/fetchers')
    const mockGet = get as unknown as ReturnType<typeof vi.fn>

    mockGet.mockResolvedValueOnce({ data: { result: [] }, error: null })

    await runAgentLogsSqlQuery({
      projectRef: 'test-ref',
      sql: 'select 1',
      dateRange: {
        from: '2026-03-13T09:50:00.000Z',
      },
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/platform/projects/{ref}/analytics/endpoints/logs.all',
      {
        params: {
          path: { ref: 'test-ref' },
          query: {
            sql: 'select 1',
            iso_timestamp_start: '2026-03-13T09:50:00.000Z',
            iso_timestamp_end: dayjs(now).toISOString(),
          },
        },
        signal: undefined,
      }
    )
  })
})
