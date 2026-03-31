import { createClient } from '@supabase/supabase-js'
import { isBrowser } from 'common'

import type { Database } from './marketplace.types'

export const createMarketplaceClient = () => {
  const API_URL = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || ''
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MARKETPLACE_PUBLISHABLE_KEY || ''

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

/**
 * Service-role marketplace client — bypasses RLS.
 * Only for server-side use (API routes). Never expose the key to the browser.
 */
export const createMarketplaceServiceClient = () => {
  const API_URL = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || ''
  const SERVICE_KEY = process.env.MARKETPLACE_SERVICE_ROLE_KEY || ''

  if (isBrowser) {
    throw new Error('createMarketplaceServiceClient should not be called in the browser')
  }

  return createClient<Database>(API_URL, SERVICE_KEY, {
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
