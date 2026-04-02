import { queryOptions } from '@tanstack/react-query'
import { handleError } from 'data/fetchers'

import { marketplaceIntegrationsKeys } from './keys'
import { createMarketplaceClient } from './marketplace-client'

async function getMarketplaceIntegrations() {
  const client = createMarketplaceClient()
  const { data, error } = await client.from('listings').select('*')

  console.log(`DATAAAAAAAAAAAAAAAAAAAAA: ${JSON.stringify(data)}`)

  if (error) handleError(error)
  return data ?? []
}

export const marketplaceIntegrationsQueryOptions = ({
  enabled = true,
}: { enabled?: boolean } = {}) => {
  return queryOptions({
    queryKey: marketplaceIntegrationsKeys.list(),
    queryFn: () => getMarketplaceIntegrations(),
    enabled,
  })
}
