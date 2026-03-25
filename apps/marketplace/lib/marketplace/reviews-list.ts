import { REVIEW_STATUSES } from '@/lib/marketplace/review-state'

export function parseReviewsFilters(searchParams?: { status?: string; listingId?: string }) {
  const requestedStatus = searchParams?.status ?? 'pending_review'
  const statusFilter =
    requestedStatus === 'all' || REVIEW_STATUSES.some((status) => status === requestedStatus)
      ? requestedStatus
      : 'pending_review'
  const listingIdFilter = searchParams?.listingId?.trim() ?? ''
  const parsedListingIdFilter = Number(listingIdFilter)
  const hasValidListingIdFilter =
    listingIdFilter.length > 0 &&
    Number.isInteger(parsedListingIdFilter) &&
    Number.isFinite(parsedListingIdFilter) &&
    parsedListingIdFilter > 0

  return {
    statusFilter,
    listingIdFilter,
    parsedListingIdFilter,
    hasValidListingIdFilter,
  }
}

export function mapReviewRows(
  reviews: Array<{
    listing_id: number
    status: string | null
    listing:
      | {
          id?: number | null
          slug?: string | null
          title?: string | null
          partner_id?: number | null
        }
      | Array<{
          id?: number | null
          slug?: string | null
          title?: string | null
          partner_id?: number | null
        }>
      | null
  }>,
  partnerTitleById: Map<number, string>
) {
  return reviews
    .map((review) => {
      const listing = Array.isArray(review.listing) ? review.listing[0] : review.listing

      if (!listing?.id || !listing.slug || !listing.title) {
        return null
      }

      return {
        reviewId: review.listing_id,
        listingId: listing.id,
        listingSlug: listing.slug,
        listingTitle: listing.title,
        partnerTitle: partnerTitleById.get(listing.partner_id ?? -1) ?? 'Unknown partner',
        status: review.status ?? 'pending_review',
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
}
