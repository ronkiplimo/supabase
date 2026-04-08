import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getListablePublicBuckets,
  useListablePublicBucketsQuery,
} from './public-buckets-with-select-policies-query'
import { PROJECT_STATUS } from '@/lib/constants'

const { mockExecuteSql, mockUseSelectedProjectQuery } = vi.hoisted(() => ({
  mockExecuteSql: vi.fn(),
  mockUseSelectedProjectQuery: vi.fn(),
}))

vi.mock('@/data/fetchers', () => ({
  isValidConnString: vi.fn((value?: string | null) => Boolean(value)),
}))

vi.mock('@/data/sql/execute-sql-query', () => ({
  executeSql: mockExecuteSql,
}))

vi.mock('@/hooks/misc/useSelectedProject', () => ({
  useSelectedProjectQuery: mockUseSelectedProjectQuery,
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('public-buckets-with-select-policies-query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSelectedProjectQuery.mockReturnValue({
      data: {
        status: PROJECT_STATUS.ACTIVE_HEALTHY,
      },
    })
  })

  it('normalises grouped listable public buckets for the advisor query', async () => {
    mockExecuteSql.mockResolvedValue({
      result: [
        {
          bucket_id: 'avatars',
          bucket_name: 'avatars',
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-02T00:00:00.000Z',
          policy_count: '2',
          policy_names: ['public bucket access', 'legacy bucket access'],
        },
      ],
    })

    const result = await getListablePublicBuckets({
      projectRef: 'project-ref',
      connectionString: 'encrypted-connection',
    })

    expect(mockExecuteSql).toHaveBeenCalledWith(
      expect.objectContaining({
        projectRef: 'project-ref',
        connectionString: 'encrypted-connection',
        sql: expect.stringContaining('GROUP BY b.id, b.name, b.created_at, b.updated_at'),
      })
    )
    expect(result).toEqual([
      {
        bucket_id: 'avatars',
        bucket_name: 'avatars',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-02T00:00:00.000Z',
        policy_count: 2,
        policy_names: ['public bucket access', 'legacy bucket access'],
      },
    ])
  })

  it('normalises missing policy names to an empty array', async () => {
    mockExecuteSql.mockResolvedValue({
      result: [
        {
          bucket_id: 'exports',
          bucket_name: 'exports',
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: null,
          policy_count: 1,
          policy_names: null,
        },
      ],
    })

    const result = await getListablePublicBuckets({
      projectRef: 'project-ref',
      connectionString: 'encrypted-connection',
    })

    expect(result).toEqual([
      {
        bucket_id: 'exports',
        bucket_name: 'exports',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: null,
        policy_count: 1,
        policy_names: [],
      },
    ])
  })

  it('waits for a valid connection string before running the advisor list query', async () => {
    mockExecuteSql.mockResolvedValue({ result: [] })
    mockUseSelectedProjectQuery.mockReturnValue({
      data: {
        status: PROJECT_STATUS.ACTIVE_HEALTHY,
        connectionString: undefined,
      },
    })

    const { result } = renderHook(
      () => useListablePublicBucketsQuery({ projectRef: 'project-ref' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle')
    })

    expect(mockExecuteSql).not.toHaveBeenCalled()
  })

  it('runs the advisor list query when a valid connection string is available', async () => {
    mockExecuteSql.mockResolvedValue({ result: [] })
    mockUseSelectedProjectQuery.mockReturnValue({
      data: {
        status: PROJECT_STATUS.ACTIVE_HEALTHY,
        connectionString: 'encrypted-connection',
      },
    })

    const { result } = renderHook(
      () => useListablePublicBucketsQuery({ projectRef: 'project-ref' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockExecuteSql).toHaveBeenCalledWith(
      expect.objectContaining({
        projectRef: 'project-ref',
        connectionString: 'encrypted-connection',
      })
    )
  })
})
