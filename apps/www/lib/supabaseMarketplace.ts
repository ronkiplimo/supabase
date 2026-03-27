import { createClient } from '@supabase/supabase-js'

// Inline the marketplace Database type so www doesn't need a cross-app import.
// This is generated from the marketplace schema — keep in sync when the schema changes.
// Only the tables/enums needed for the public landing page are included.
type MarketplaceDatabase = {
  public: {
    Tables: {
      listings: {
        Row: {
          id: number
          partner_id: number
          slug: string
          title: string
          summary: string | null
          content: string | null
          published: boolean
          type: 'oauth' | 'template'
          url: string | null
          registry_listing_url: string | null
          files: string[]
          documentation_url: string | null
          initiation_action_url: string | null
          initiation_action_method: 'POST' | 'GET' | null
          submitted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          slug: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      category_listings: {
        Row: {
          category_id: number
          listing_id: number
          created_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      listing_reviews: {
        Row: {
          listing_id: number
          status: string
          featured: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      partners: {
        Row: {
          id: number
          slug: string
          title: string
          description: string | null
          website: string | null
          logo_url: string | null
          role: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type MarketplaceListing = MarketplaceDatabase['public']['Tables']['listings']['Row']

export type MarketplaceListingWithRelations = MarketplaceListing & {
  categories: Array<{ slug: string; title: string }>
  partner: { title: string; logo_url: string | null; slug: string; website: string | null } | null
  listing_reviews: { featured: boolean } | null
}

const supabaseMarketplace = createClient<MarketplaceDatabase>(
  process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || '',
  process.env.NEXT_PUBLIC_MARKETPLACE_PUBLISHABLE_KEY || ''
)

/**
 * Fetches published marketplace listings with approved reviews.
 * Only returns listings visible to the anonymous role (published + latest review approved via RLS).
 */
export async function getPublishedMarketplaceListings(): Promise<MarketplaceListingWithRelations[]> {
  const { data, error } = await supabaseMarketplace
    .from('listings')
    .select(
      '*, categories:category_listings(...categories(slug, title)), partner:partners(title, logo_url, slug, website), listing_reviews(featured)'
    )
    .eq('published', true)
    .order('title', { ascending: true })

  if (error) {
    console.error('Failed to fetch marketplace listings:', error.message)
    return []
  }

  return (data ?? []) as MarketplaceListingWithRelations[]
}

export default supabaseMarketplace
