import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  BreadcrumbItem_Shadcn_ as BreadcrumbItem,
  BreadcrumbLink_Shadcn_ as BreadcrumbLink,
  BreadcrumbList_Shadcn_ as BreadcrumbList,
  BreadcrumbPage_Shadcn_ as BreadcrumbPage,
  BreadcrumbSeparator_Shadcn_ as BreadcrumbSeparator,
} from 'ui'
import {
  PageHeader,
  PageHeaderAside,
  PageHeaderBreadcrumb,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'
import type { MarketplaceItemFile } from 'ui-patterns/MarketplaceItem'

import { ListingEditorSplitView } from '@/components/item-editor-split-view'
import { ListingReviewPrimaryAction } from '@/components/item-review-primary-action'
import { deriveOpenReviewState } from '@/lib/marketplace/review-state'
import { createClient } from '@/lib/supabase/server'

type EditListingPageProps = {
  params: {
    partnerslug: string
    slug: string
  }
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { partnerslug, slug } = params
  const supabase = await createClient()

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id, slug, title')
    .eq('slug', partnerslug)
    .maybeSingle()

  if (partnerError || !partner) {
    notFound()
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select(
      'id, slug, title, summary, content, published, type, url, registry_listing_url, documentation_url, initiation_action_url, initiation_action_method, files, updated_at'
    )
    .eq('partner_id', partner.id)
    .eq('slug', slug)
    .maybeSingle()

  if (listingError || !listing) {
    notFound()
  }

  const { data: latestReview, error: latestReviewError } = await supabase
    .from('listing_reviews')
    .select('status, review_notes')
    .eq('listing_id', listing.id)
    .maybeSingle()

  if (latestReviewError) {
    throw new Error(latestReviewError.message)
  }

  const { hasOpenReview, isApproved, openReviewStatusLabel } = deriveOpenReviewState(
    latestReview?.status
  )

  const previewFiles: MarketplaceItemFile[] = ((listing.files ?? []) as string[]).map((fileUrl) => {
    const fileName = fileUrl.split('/').pop() ?? fileUrl
    return {
      id: fileUrl,
      name: fileName,
      href: fileUrl,
      description: fileUrl,
    }
  })

  return (
    <div className="flex h-full min-h-full min-w-0 flex-col">
      <PageHeader size="full" className="border-b pb-6 [&>div]:px-6 [&>div]:xl:px-6">
        <PageHeaderBreadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/protected/${partner.slug}/items`}>Listings</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{listing.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </PageHeaderBreadcrumb>
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>{listing.title}</PageHeaderTitle>
          </PageHeaderSummary>
          <PageHeaderAside>
            <ListingReviewPrimaryAction
              listingId={listing.id}
              listingSlug={listing.slug}
              partnerSlug={partner.slug}
              isApproved={isApproved}
              hasOpenReview={hasOpenReview}
              latestReviewStatus={latestReview?.status ?? null}
              latestReviewNotes={latestReview?.review_notes ?? null}
              openReviewStatusLabel={openReviewStatusLabel}
            />
          </PageHeaderAside>
        </PageHeaderMeta>
      </PageHeader>

      <div className="min-h-0 flex-1">
        <ListingEditorSplitView
          mode="edit"
          partner={{ id: partner.id, slug: partner.slug, title: partner.title }}
          listing={listing}
          initialFiles={listing.files ?? []}
          initialPreviewFiles={previewFiles}
        />
      </div>
    </div>
  )
}
