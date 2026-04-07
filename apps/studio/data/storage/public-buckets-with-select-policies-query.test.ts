import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getListablePublicBuckets } from './public-buckets-with-select-policies-query'

const { mockExecuteSql } = vi.hoisted(() => ({
  mockExecuteSql: vi.fn(),
}))

vi.mock('@/data/sql/execute-sql-query', () => ({
  executeSql: mockExecuteSql,
}))

describe('public-buckets-with-select-policies-query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
