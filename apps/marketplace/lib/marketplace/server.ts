import { createClient } from '@/lib/supabase/server'
import type { ReviewStatus } from '@/lib/marketplace/review-state'

export type PartnerSidebarData = {
  id: number
  slug: string
  title: string
  membershipRole: 'member' | 'admin'
  partnerRole: 'partner' | 'reviewer' | 'admin'
  listings: Array<{
    id: number
    slug: string
    title: string
    latestReviewStatus: ReviewStatus | null
  }>
}

export async function getMarketplaceSidebarData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      partners: [] as PartnerSidebarData[],
      isReviewerMember: false,
    }
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('partner_members')
    .select('role, partner:partners(id, slug, title, role)')
    .eq('user_id', user.id)

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  const partnerMap = new Map<number, PartnerSidebarData>()
  for (const entry of memberships ?? []) {
    const partnerValue = Array.isArray(entry.partner) ? entry.partner[0] : entry.partner
    const partner = partnerValue as
      | { id: number; slug: string; title: string; role: 'partner' | 'reviewer' | 'admin' }
      | null
    if (!partner) continue
    partnerMap.set(partner.id, {
      id: partner.id,
      slug: partner.slug,
      title: partner.title,
      membershipRole: entry.role === 'admin' ? 'admin' : 'member',
      partnerRole: partner.role,
      listings: [],
    })
  }

  const partnerIds = Array.from(partnerMap.keys())

  if (partnerIds.length > 0) {
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, partner_id, slug, title, listing_reviews(status)')
      .in('partner_id', partnerIds)
      .order('title', { ascending: true })

    if (listingsError) {
      throw new Error(listingsError.message)
    }

    for (const listing of (listings ?? []) as Array<{
      id: number
      partner_id: number
      slug: string
      title: string
      listing_reviews?:
        | {
            status: ReviewStatus | null
          }
        | Array<{
            status: ReviewStatus | null
          }>
        | null
    }>) {
      const partner = partnerMap.get(listing.partner_id)
      if (!partner) continue
      const latestReview = Array.isArray(listing.listing_reviews) ? listing.listing_reviews[0] : listing.listing_reviews

      partner.listings.push({
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        latestReviewStatus: latestReview?.status ?? null,
      })
    }
  }

  const partners = Array.from(partnerMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  )
  const isReviewerMember = partners.some(
    (partner) => partner.partnerRole === 'reviewer' || partner.partnerRole === 'admin'
  )
  return { user, partners, isReviewerMember }
}
