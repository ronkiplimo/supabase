import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY

const hasRequiredEnv = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SERVICE_ROLE_KEY)
const describeIfConfigured = hasRequiredEnv ? describe : describe.skip

const RUN_ID = crypto.randomUUID().slice(0, 8)

const PARTNER_USER_ID = crypto.randomUUID()
const OTHER_PARTNER_USER_ID = crypto.randomUUID()
const REVIEWER_USER_ID = crypto.randomUUID()

const PARTNER_EMAIL = `partner-${RUN_ID}@test.local`
const OTHER_PARTNER_EMAIL = `other-partner-${RUN_ID}@test.local`
const REVIEWER_EMAIL = `reviewer-${RUN_ID}@test.local`
const PASSWORD = 'password123'

const PARTNER_SLUG = `partner-${RUN_ID}`
const OTHER_PARTNER_SLUG = `other-${RUN_ID}`
const REVIEWER_PARTNER_SLUG = `reviewers-${RUN_ID}`
const CATEGORY_SLUG = `category-${RUN_ID}`

let partnerId: number
let otherPartnerId: number
let reviewerPartnerId: number
let partnerListingId: number
let otherPartnerListingId: number
let partnerDraftListingId: number
let categoryId: number

const admin = hasRequiredEnv
  ? createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const partnerClient = hasRequiredEnv
  ? createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const otherPartnerClient = hasRequiredEnv
  ? createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const reviewerClient = hasRequiredEnv
  ? createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const publicClient = hasRequiredEnv
  ? createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

async function signIn(
  client: NonNullable<typeof partnerClient>,
  email: string,
  password: string
) {
  const { error } = await client.auth.signInWithPassword({ email, password })
  expect(error).toBeNull()
}

describeIfConfigured('Marketplace RLS policies', () => {
  beforeAll(async () => {
    const adminClient = admin!

    await Promise.all([
      adminClient.auth.admin.createUser({
        id: PARTNER_USER_ID,
        email: PARTNER_EMAIL,
        password: PASSWORD,
        email_confirm: true,
      }),
      adminClient.auth.admin.createUser({
        id: OTHER_PARTNER_USER_ID,
        email: OTHER_PARTNER_EMAIL,
        password: PASSWORD,
        email_confirm: true,
      }),
      adminClient.auth.admin.createUser({
        id: REVIEWER_USER_ID,
        email: REVIEWER_EMAIL,
        password: PASSWORD,
        email_confirm: true,
      }),
    ])

    const { data: partnerRows, error: partnerInsertError } = await adminClient
      .from('partners')
      .insert([
        {
          slug: PARTNER_SLUG,
          title: 'Partner Under Test',
          role: 'partner',
          created_by: PARTNER_USER_ID,
        },
        {
          slug: OTHER_PARTNER_SLUG,
          title: 'Other Partner Under Test',
          role: 'partner',
          created_by: OTHER_PARTNER_USER_ID,
        },
        {
          slug: REVIEWER_PARTNER_SLUG,
          title: 'Reviewer Org Under Test',
          role: 'reviewer',
          created_by: REVIEWER_USER_ID,
        },
      ])
      .select('id, slug')

    expect(partnerInsertError).toBeNull()
    expect(partnerRows).toBeDefined()

    const partnersBySlug = new Map(partnerRows!.map((row) => [row.slug, row.id]))
    partnerId = partnersBySlug.get(PARTNER_SLUG)!
    otherPartnerId = partnersBySlug.get(OTHER_PARTNER_SLUG)!
    reviewerPartnerId = partnersBySlug.get(REVIEWER_PARTNER_SLUG)!

    const { error: memberInsertError } = await adminClient.from('partner_members').insert([
      {
        partner_id: partnerId,
        user_id: PARTNER_USER_ID,
        role: 'admin',
      },
      {
        partner_id: otherPartnerId,
        user_id: OTHER_PARTNER_USER_ID,
        role: 'admin',
      },
      {
        partner_id: reviewerPartnerId,
        user_id: REVIEWER_USER_ID,
        role: 'admin',
      },
    ])
    expect(memberInsertError).toBeNull()

    const { data: listingRows, error: listingInsertError } = await adminClient
      .from('listings')
      .insert([
        {
          partner_id: partnerId,
          slug: `partner-listing-${RUN_ID}`,
          title: 'Partner Visible Listing',
          type: 'oauth',
          url: 'https://example.com/partner',
          submitted_by: PARTNER_USER_ID,
        },
        {
          partner_id: otherPartnerId,
          slug: `other-partner-listing-${RUN_ID}`,
          title: 'Other Partner Listing',
          type: 'oauth',
          url: 'https://example.com/other',
          submitted_by: OTHER_PARTNER_USER_ID,
        },
      ])
      .select('id, partner_id')

    expect(listingInsertError).toBeNull()
    expect(listingRows).toHaveLength(2)

    const ownListing = listingRows!.find((row) => row.partner_id === partnerId)
    const foreignListing = listingRows!.find((row) => row.partner_id === otherPartnerId)
    partnerListingId = ownListing!.id
    otherPartnerListingId = foreignListing!.id

    const { data: categoryRow, error: categoryInsertError } = await adminClient
      .from('categories')
      .insert({
        slug: CATEGORY_SLUG,
        title: 'Category Under Test',
        description: 'Category for public RLS coverage',
      })
      .select('id')
      .single()

    expect(categoryInsertError).toBeNull()
    expect(categoryRow).toBeDefined()
    categoryId = categoryRow!.id

    const { error: categoryListingInsertError } = await adminClient.from('category_listings').insert({
      category_id: categoryId,
      listing_id: partnerListingId,
    })
    expect(categoryListingInsertError).toBeNull()

    const { error: reviewInsertError } = await adminClient.from('listing_reviews').insert({
      listing_id: partnerListingId,
      status: 'pending_review',
      featured: false,
    })
    expect(reviewInsertError).toBeNull()

    const { error: listingFilesUpdateError } = await adminClient
      .from('listings')
      .update({
        files: [
          `${process.env.SUPABASE_URL}/storage/v1/object/public/listing_files/${partnerId}/listings/${partnerListingId}/preview.png`,
        ],
      })
      .eq('id', partnerListingId)
    expect(listingFilesUpdateError).toBeNull()

    const { error: otherListingFilesUpdateError } = await adminClient
      .from('listings')
      .update({
        files: [
          `${process.env.SUPABASE_URL}/storage/v1/object/public/listing_files/${otherPartnerId}/listings/${otherPartnerListingId}/preview.png`,
        ],
      })
      .eq('id', otherPartnerListingId)
    expect(otherListingFilesUpdateError).toBeNull()

    await Promise.all([
      signIn(partnerClient!, PARTNER_EMAIL, PASSWORD),
      signIn(otherPartnerClient!, OTHER_PARTNER_EMAIL, PASSWORD),
      signIn(reviewerClient!, REVIEWER_EMAIL, PASSWORD),
    ])
  })

  afterAll(async () => {
    if (!admin) return

    await admin.from('category_listings').delete().eq('category_id', categoryId)

    await admin.from('categories').delete().eq('id', categoryId)

    await admin
      .from('listing_reviews')
      .delete()
      .in('listing_id', [partnerListingId, otherPartnerListingId, partnerDraftListingId].filter(Boolean))

    await admin
      .from('listings')
      .delete()
      .in('id', [partnerListingId, otherPartnerListingId, partnerDraftListingId].filter(Boolean))

    await admin
      .from('partner_members')
      .delete()
      .in('user_id', [PARTNER_USER_ID, OTHER_PARTNER_USER_ID, REVIEWER_USER_ID])

    await admin.from('partners').delete().in('id', [partnerId, otherPartnerId, reviewerPartnerId].filter(Boolean))

    await Promise.all([
      admin.auth.admin.deleteUser(PARTNER_USER_ID),
      admin.auth.admin.deleteUser(OTHER_PARTNER_USER_ID),
      admin.auth.admin.deleteUser(REVIEWER_USER_ID),
    ])
  })

  it('allows partners to read only their own listings', async () => {
    const { data, error } = await partnerClient!.from('listings').select('id, partner_id')

    expect(error).toBeNull()
    expect(data?.some((listing) => listing.id === partnerListingId)).toBe(true)
    expect(data?.some((listing) => listing.id === otherPartnerListingId)).toBe(false)
  })

  it('blocks partner listing inserts for a different partner', async () => {
    const { error } = await partnerClient!.from('listings').insert({
      partner_id: otherPartnerId,
      slug: `blocked-cross-partner-${RUN_ID}`,
      title: 'Should Not Insert',
      type: 'oauth',
      url: 'https://example.com/blocked',
      submitted_by: PARTNER_USER_ID,
    })

    expect(error).not.toBeNull()
  })

  it('allows partner inserts only with own submitted_by', async () => {
    const { data: ownInsertData, error: ownInsertError } = await partnerClient!
      .from('listings')
      .insert({
        partner_id: partnerId,
        slug: `allowed-own-listing-${RUN_ID}`,
        title: 'Own Partner Insert',
        type: 'oauth',
        url: 'https://example.com/own',
        submitted_by: PARTNER_USER_ID,
      })
      .select('id')
      .single()

    expect(ownInsertError).toBeNull()
    expect(ownInsertData).toBeDefined()
    partnerDraftListingId = ownInsertData!.id

    const { error: spoofedSubmitterError } = await partnerClient!.from('listings').insert({
      partner_id: partnerId,
      slug: `blocked-submitter-spoof-${RUN_ID}`,
      title: 'Spoofed Submitter',
      type: 'oauth',
      url: 'https://example.com/spoof',
      submitted_by: OTHER_PARTNER_USER_ID,
    })

    expect(spoofedSubmitterError).not.toBeNull()
  })

  it('allows partner review requests only as pending_review', async () => {
    const { error: blockedError } = await partnerClient!.from('listing_reviews').insert({
      listing_id: partnerDraftListingId,
      status: 'approved',
      featured: true,
      reviewed_by: PARTNER_USER_ID,
    })
    expect(blockedError).not.toBeNull()

    const { error: allowedError } = await partnerClient!.from('listing_reviews').insert({
      listing_id: partnerDraftListingId,
      status: 'pending_review',
      featured: false,
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      published_at: null,
    })
    expect(allowedError).toBeNull()
  })

  it('prevents partners from approving reviews and allows reviewer approval', async () => {
    const { error: partnerUpdateError } = await partnerClient!
      .from('listing_reviews')
      .update({
        status: 'approved',
        review_notes: 'Partner attempted approval',
        reviewed_by: PARTNER_USER_ID,
      })
      .eq('listing_id', partnerListingId)

    expect(partnerUpdateError).toBeNull()

    const { data: afterPartnerAttempt, error: afterPartnerAttemptError } = await admin!
      .from('listing_reviews')
      .select('status, reviewed_by')
      .eq('listing_id', partnerListingId)
      .single()

    expect(afterPartnerAttemptError).toBeNull()
    expect(afterPartnerAttempt?.status).toBe('pending_review')
    expect(afterPartnerAttempt?.reviewed_by).toBeNull()

    const { error: reviewerUpdateError } = await reviewerClient!
      .from('listing_reviews')
      .update({
        status: 'approved',
        featured: true,
        reviewed_by: REVIEWER_USER_ID,
        review_notes: 'Approved by reviewer',
      })
      .eq('listing_id', partnerListingId)

    expect(reviewerUpdateError).toBeNull()

    const { data: finalReview, error: finalReviewError } = await admin!
      .from('listing_reviews')
      .select('status, reviewed_by, featured')
      .eq('listing_id', partnerListingId)
      .single()

    expect(finalReviewError).toBeNull()
    expect(finalReview?.status).toBe('approved')
    expect(finalReview?.reviewed_by).toBe(REVIEWER_USER_ID)
    expect(finalReview?.featured).toBe(true)
  })

  it('allows anonymous reads for categories', async () => {
    const { data, error } = await publicClient!.from('categories').select('id, slug').eq('id', categoryId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0]?.slug).toBe(CATEGORY_SLUG)
  })

  it('allows anonymous reads only for published listings with latest approved review', async () => {
    const { error: pendingSetupError } = await admin!
      .from('listings')
      .update({ published: true })
      .eq('id', partnerListingId)
    expect(pendingSetupError).toBeNull()

    const { error: pendingReviewError } = await admin!
      .from('listing_reviews')
      .update({
        status: 'pending_review',
        reviewed_by: REVIEWER_USER_ID,
      })
      .eq('listing_id', partnerListingId)
    expect(pendingReviewError).toBeNull()

    const { data: pendingListings, error: pendingListingsError } = await publicClient!
      .from('listings')
      .select('id, files')
      .eq('id', partnerListingId)
    expect(pendingListingsError).toBeNull()
    expect(pendingListings).toHaveLength(0)

    const { data: pendingCategoryListings, error: pendingCategoryListingsError } = await publicClient!
      .from('category_listings')
      .select('category_id, listing_id')
      .eq('category_id', categoryId)
      .eq('listing_id', partnerListingId)
    expect(pendingCategoryListingsError).toBeNull()
    expect(pendingCategoryListings).toHaveLength(0)

    const { data: pendingPartners, error: pendingPartnersError } = await publicClient!
      .from('partners')
      .select('id')
      .in('id', [partnerId, otherPartnerId])
    expect(pendingPartnersError).toBeNull()
    expect(pendingPartners).toHaveLength(0)

    const { error: approvedReviewError } = await admin!
      .from('listing_reviews')
      .update({
        status: 'approved',
        reviewed_by: REVIEWER_USER_ID,
      })
      .eq('listing_id', partnerListingId)
    expect(approvedReviewError).toBeNull()

    const { data: approvedListings, error: approvedListingsError } = await publicClient!
      .from('listings')
      .select('id, files')
      .eq('id', partnerListingId)
    expect(approvedListingsError).toBeNull()
    expect(approvedListings).toHaveLength(1)
    expect(approvedListings?.[0]?.files).toHaveLength(1)

    const { data: approvedCategoryListings, error: approvedCategoryListingsError } = await publicClient!
      .from('category_listings')
      .select('category_id, listing_id')
      .eq('category_id', categoryId)
      .eq('listing_id', partnerListingId)
    expect(approvedCategoryListingsError).toBeNull()
    expect(approvedCategoryListings).toHaveLength(1)

    const { data: approvedPartners, error: approvedPartnersError } = await publicClient!
      .from('partners')
      .select('id')
      .in('id', [partnerId, otherPartnerId])
    expect(approvedPartnersError).toBeNull()
    expect(approvedPartners).toHaveLength(1)
    expect(approvedPartners?.[0]?.id).toBe(partnerId)

    const { error: unpublishedSetupError } = await admin!
      .from('listings')
      .update({ published: false })
      .eq('id', partnerListingId)
    expect(unpublishedSetupError).toBeNull()

    const { data: unpublishedListings, error: unpublishedListingsError } = await publicClient!
      .from('listings')
      .select('id, files')
      .eq('id', partnerListingId)
    expect(unpublishedListingsError).toBeNull()
    expect(unpublishedListings).toHaveLength(0)

    const { data: unpublishedCategoryListings, error: unpublishedCategoryListingsError } = await publicClient!
      .from('category_listings')
      .select('category_id, listing_id')
      .eq('category_id', categoryId)
      .eq('listing_id', partnerListingId)
    expect(unpublishedCategoryListingsError).toBeNull()
    expect(unpublishedCategoryListings).toHaveLength(0)

    const { data: unpublishedPartners, error: unpublishedPartnersError } = await publicClient!
      .from('partners')
      .select('id')
      .in('id', [partnerId, otherPartnerId])
    expect(unpublishedPartnersError).toBeNull()
    expect(unpublishedPartners).toHaveLength(0)
  })
})
