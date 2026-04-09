import { createClient } from '@supabase/supabase-js'

import type { Database } from './marketplace.types'

export const createMarketplaceClient = () => {
  if (!process.env.NEXT_PUBLIC_MARKETPLACE_API_URL) {
    throw new Error('NEXT_PUBLIC_MARKETPLACE_API_URL env var not set')
  }
  if (!process.env.NEXT_PUBLIC_MARKETPLACE_PUBLISHABLE_KEY) {
    throw new Error('NEXT_PUBLIC_MARKETPLACE_PUBLISHABLE_KEY env var not set')
  }

  const API_URL = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MARKETPLACE_PUBLISHABLE_KEY

  return createClient<Database>(API_URL, PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (_key: string) => null,
        setItem: (_key: string, _value: string) => {},
        removeItem: (_key: string) => {},
      },
    },
  })
}

export const marketplaceClient = createMarketplaceClient()
