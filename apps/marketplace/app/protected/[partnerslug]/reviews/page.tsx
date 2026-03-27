import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'

import { ReviewsFilters } from './reviews-filters'
import { mapReviewRows, parseReviewsFilters } from '@/lib/marketplace/reviews-list'
import { createClient } from '@/lib/supabase/server'

type ReviewsPageProps = {
  params: {
    partnerslug: string
  }
  searchParams?:
    | {
        status?: string
        listingId?: string
      }
    | Promise<{
        status?: string
        listingId?: string
      }>
}

export default async function ReviewsPage({ params, searchParams }: ReviewsPageProps) {
  const { partnerslug } = await params
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { statusFilter, listingIdFilter, parsedListingIdFilter, hasValidListingIdFilter } =
    parseReviewsFilters(resolvedSearchParams)

  const { data: currentPartner, error: currentPartnerError } = await supabase
    .from('partners')
    .select('id, slug, title, role')
    .eq('slug', partnerslug)
    .maybeSingle()

  if (
    currentPartnerError ||
    !currentPartner ||
    (currentPartner.role !== 'reviewer' && currentPartner.role !== 'admin')
  ) {
    notFound()
  }

  let reviewsQuery = supabase
    .from('listing_reviews')
    .select('listing_id, status, listing:listings(id, slug, title, partner_id)')
    .order('updated_at', { ascending: false })

  if (statusFilter !== 'all') {
    reviewsQuery = reviewsQuery.eq('status', statusFilter)
  }

  if (hasValidListingIdFilter) {
    reviewsQuery = reviewsQuery.eq('listing_id', parsedListingIdFilter)
  }

  const { data: reviews, error: reviewsError } = await reviewsQuery

  if (reviewsError) {
    throw new Error(reviewsError.message)
  }

  const partnerIds = Array.from(
    new Set(
      (reviews ?? [])
        .map((review) => {
          const listing = Array.isArray(review.listing) ? review.listing[0] : review.listing
          return listing?.partner_id
        })
        .filter((partnerId): partnerId is number => Number.isFinite(partnerId))
    )
  )

  const { data: reviewPartners, error: reviewPartnersError } =
    partnerIds.length > 0
      ? await supabase.from('partners').select('id, title').in('id', partnerIds)
      : { data: [], error: null }

  if (reviewPartnersError) {
    throw new Error(reviewPartnersError.message)
  }

  const partnerTitleById = new Map(
    (reviewPartners ?? []).map((partner) => [partner.id, partner.title])
  )

  const reviewRows = mapReviewRows(reviews ?? [], partnerTitleById)

  return (
    <>
      <PageHeader size="default">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Reviews</PageHeaderTitle>
            <PageHeaderDescription>
              Review marketplace listings submitted from all partners
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>
      <PageContainer size="default">
        <PageSection>
          <PageSectionContent>
            <ReviewsFilters status={statusFilter} listingId={listingIdFilter} />
            {reviewRows.length === 0 ? (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                {statusFilter === 'pending_review' && !hasValidListingIdFilter
                  ? 'No pending reviews right now.'
                  : 'No reviews match these filters.'}
              </div>
            ) : (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Listing</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewRows.map((review) => (
                      <TableRow key={review.reviewId} className="group">
                        <TableCell className="p-0 text-muted-foreground">
                          <Link
                            href={`/protected/${partnerslug}/reviews/${review.listingId}`}
                            className="block px-4 py-4 group-hover:underline"
                          >
                            {review.partnerTitle}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 font-medium">
                          <Link
                            href={`/protected/${partnerslug}/reviews/${review.listingId}`}
                            className="block px-4 py-4 group-hover:underline"
                          >
                            {review.listingTitle}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-muted-foreground">
                          <Link
                            href={`/protected/${partnerslug}/reviews/${review.listingId}`}
                            className="block px-4 py-4 group-hover:underline"
                          >
                            /{review.listingSlug}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-muted-foreground">
                          <Link
                            href={`/protected/${partnerslug}/reviews/${review.listingId}`}
                            className="block px-4 py-4 capitalize group-hover:underline"
                          >
                            {review.status.replace(/_/g, ' ')}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PageSectionContent>
        </PageSection>
      </PageContainer>
    </>
  )
}
