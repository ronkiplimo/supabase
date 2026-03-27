import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  BreadcrumbItem_Shadcn_ as BreadcrumbItem,
  BreadcrumbLink_Shadcn_ as BreadcrumbLink,
  BreadcrumbList_Shadcn_ as BreadcrumbList,
  BreadcrumbPage_Shadcn_ as BreadcrumbPage,
  BreadcrumbSeparator_Shadcn_ as BreadcrumbSeparator,
} from 'ui'
import { MarketplaceItem, type MarketplaceItemFile } from 'ui-patterns/MarketplaceItem'
import {
  PageHeader,
  PageHeaderBreadcrumb,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

import { ReviewDecisionForm } from './review-decision-form'
import { deriveReviewDecisionDefaults } from '@/lib/marketplace/review-state'
import { createClient } from '@/lib/supabase/server'

type ReviewDetailPageProps = {
  params: {
    partnerslug: string
    itemId: string
  }
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { partnerslug, itemId } = await params
  const supabase = await createClient()
  const parsedListingId = Number(itemId)

  if (!Number.isFinite(parsedListingId)) {
    notFound()
  }

  const { data: reviewerPartner, error: reviewerPartnerError } = await supabase
    .from('partners')
    .select('id, slug, title, role')
    .eq('slug', partnerslug)
    .maybeSingle()

  if (
    reviewerPartnerError ||
    !reviewerPartner ||
    (reviewerPartner.role !== 'reviewer' && reviewerPartner.role !== 'admin')
  ) {
    notFound()
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select(
      'id, slug, title, summary, url, registry_listing_url, documentation_url, content, type, files, updated_at, partner:partners(id, slug, title), review:listing_reviews(status, featured, review_notes, reviewed_at)'
    )
    .eq('id', parsedListingId)
    .maybeSingle()

  if (listingError || !listing) {
    notFound()
  }

  const latestReview = Array.isArray(listing.review) ? listing.review[0] : listing.review
  const reviewDefaults = deriveReviewDecisionDefaults(latestReview)

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, title')
    .order('title', { ascending: true })

  if (categoriesError) {
    throw new Error(categoriesError.message)
  }

  const { data: assignedCategoryRows, error: assignedCategoryRowsError } = await supabase
    .from('category_listings')
    .select('category:categories(title)')
    .eq('listing_id', listing.id)

  if (assignedCategoryRowsError) {
    throw new Error(assignedCategoryRowsError.message)
  }

  const assignedCategoryTitles = (assignedCategoryRows ?? [])
    .map((entry) => {
      const category = Array.isArray(entry.category) ? entry.category[0] : entry.category
      return category?.title
    })
    .filter((title): title is string => typeof title === 'string')

  const reviewFormDefaults = {
    ...reviewDefaults,
    categories: assignedCategoryTitles,
  }

  const marketplaceFiles: MarketplaceItemFile[] = ((listing.files ?? []) as string[]).map(
    (fileUrl) => {
      const fileName = fileUrl.split('/').pop() ?? fileUrl
      return {
        id: fileUrl,
        name: fileName,
        href: fileUrl,
        description: fileUrl,
      }
    }
  )

  return (
    <div className="flex h-full min-h-full min-w-0 flex-col">
      <PageHeader size="full" className="border-b pb-6 [&>div]:px-6 [&>div]:xl:px-6">
        <PageHeaderBreadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/protected/${partnerslug}/reviews`}>Reviews</Link>
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
        </PageHeaderMeta>
      </PageHeader>

      <div className="flex min-h-0 flex-1 min-w-0">
        <section className="max-w-xl w-full min-w-lg overflow-y-auto border-r">
          <ReviewDecisionForm
            partnerSlug={partnerslug}
            listingId={listing.id}
            defaultValues={reviewFormDefaults}
            categoryOptions={categories ?? []}
          />
        </section>

        <section className="min-w-0 flex-1 h-full p-6 overflow-hidden bg-muted/50">
          <div className="rounded-lg border bg-background shadow-sm h-full flex flex-col">
            <div className="flex items-center h-10 border-b px-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-red-400" />
                <span className="inline-block size-2 rounded-full bg-yellow-400" />
                <span className="inline-block size-2 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted w-3xl truncate px-3 py-0.5 rounded border font-mono">
                  {listing.slug
                    ? `https://supabase.com/marketplace/${listing.slug}`
                    : 'https://example.com/listing'}
                </span>
              </div>
              <div className="w-14" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <MarketplaceItem
                title={listing.title || 'Untitled listing'}
                summary={listing.summary}
                content={listing.content}
                primaryActionUrl={
                  listing.type === 'template' ? listing.registry_listing_url : listing.url
                }
                files={marketplaceFiles}
                partnerName={(listing.partner as { title?: string } | null)?.title}
                lastUpdatedAt={listing.updated_at}
                type={listing.type}
                metaFields={[
                  ...(listing.type === 'oauth'
                    ? [
                        {
                          label: 'Listing URL',
                          value: listing.url ? (
                            <a
                              href={listing.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-2"
                            >
                              {listing.url}
                            </a>
                          ) : (
                            'No URL provided'
                          ),
                        },
                      ]
                    : []),
                  {
                    label: 'Documentation URL',
                    value: listing.documentation_url ? (
                      <a
                        href={listing.documentation_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {listing.documentation_url}
                      </a>
                    ) : (
                      'No URL provided'
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
