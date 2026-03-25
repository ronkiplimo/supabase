import { describe, expect, it } from 'vitest'

import { mapReviewRows, parseReviewsFilters } from './reviews-list'

describe('reviews-list utils', () => {
  it('parses review filters with fallback behavior', () => {
    expect(parseReviewsFilters({ status: 'approved', listingId: '42' })).toMatchObject({
      statusFilter: 'approved',
      listingIdFilter: '42',
      parsedListingIdFilter: 42,
      hasValidListingIdFilter: true,
    })

    expect(parseReviewsFilters({ status: 'bad-status', listingId: 'nope' })).toMatchObject({
      statusFilter: 'pending_review',
      hasValidListingIdFilter: false,
    })
  })

  it('maps review rows and filters invalid records', () => {
    const rows = mapReviewRows(
      [
        {
          listing_id: 1,
          status: 'approved',
          listing: { id: 10, slug: 'auth', title: 'Auth', partner_id: 9 },
        },
        {
          listing_id: 2,
          status: null,
          listing: null,
        },
      ],
      new Map([[9, 'Partner A']])
    )

    expect(rows).toEqual([
      {
        reviewId: 1,
        listingId: 10,
        listingSlug: 'auth',
        listingTitle: 'Auth',
        partnerTitle: 'Partner A',
        status: 'approved',
      },
    ])
  })
})
