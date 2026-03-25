import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

import { getMarketplaceSidebarData } from './server'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getMarketplaceSidebarData', () => {
  it('returns empty data for unauthenticated users', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const result = await getMarketplaceSidebarData()
    expect(result.user).toBeNull()
    expect(result.partners).toEqual([])
    expect(result.isReviewerMember).toBe(false)
  })

  it('aggregates partners, listings, and reviewer membership', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'partner_members') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    role: 'admin',
                    partner: { id: 2, slug: 'reviewers', title: 'Reviewers', role: 'reviewer' },
                  },
                  {
                    role: 'member',
                    partner: { id: 1, slug: 'acme', title: 'Acme', role: 'partner' },
                  },
                ],
                error: null,
              }),
            }),
          }
        }

        if (table === 'listings') {
          return {
            select: () => ({
              in: () => ({
                order: async () => ({
                  data: [
                    {
                      id: 11,
                      partner_id: 1,
                      slug: 'a-listing',
                      title: 'A Listing',
                      listing_reviews: { status: 'approved' },
                    },
                    { id: 10, partner_id: 1, slug: 'b-listing', title: 'B Listing', listing_reviews: null },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }

        return {}
      }),
    })

    const result = await getMarketplaceSidebarData()
    expect(result.partners.map((partner) => partner.slug)).toEqual(['acme', 'reviewers'])
    expect(result.partners[0]?.listings.map((listing) => listing.slug)).toEqual(['a-listing', 'b-listing'])
    expect(result.partners[0]?.listings.map((listing) => listing.latestReviewStatus)).toEqual([
      'approved',
      null,
    ])
    expect(result.isReviewerMember).toBe(true)
  })
})
