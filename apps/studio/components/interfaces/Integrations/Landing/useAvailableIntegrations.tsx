import { useQuery } from '@tanstack/react-query'
import { FeatureFlagContext, IS_PLATFORM, useFlag } from 'common'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useContext, useMemo } from 'react'

import { INTEGRATIONS, Loading, type IntegrationDefinition } from './Integrations.constants'
import { marketplaceIntegrationsQueryOptions } from '@/data/marketplace/integrations-query'
import { useCLIReleaseVersionQuery } from '@/data/misc/cli-release-version-query'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'

const getIconUrl = (partnerSlug: string, partnerLogo: string) => {
  const API_URL = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || ''
  return `${API_URL}/storage/v1/object/public/images/partners/${partnerSlug}/${partnerLogo}`
}

/**
 * [Joshen] Returns a combination of
 * - Marketplace integrations retrieved remotely (Only if feature flag enabled)
 * - Existing integrations that are defined within studio
 */
export const useAvailableIntegrations = () => {
  const { hasLoaded } = useContext(FeatureFlagContext)
  const isMarketplaceEnabled = useFlag('marketplaceIntegrations')
  const { integrationsWrappers } = useIsFeatureEnabled(['integrations:wrappers'])

  const { data: cliData } = useCLIReleaseVersionQuery()
  const isCLI = !!cliData?.current

  const { data, error } = useQuery({
    ...marketplaceIntegrationsQueryOptions(),
    enabled: isMarketplaceEnabled,
  })
  const isPending = IS_PLATFORM && (!hasLoaded || (isMarketplaceEnabled && !data && !error))
  const isSuccess = !IS_PLATFORM || (hasLoaded && (!isMarketplaceEnabled || (!!data && !error)))
  const isError = IS_PLATFORM && isMarketplaceEnabled && !!error

  // [Joshen] Format marketplace integrations into existing ones for now
  // Likely that we might need to change, but can look into separately
  const marketplaceIntegrations: IntegrationDefinition[] = (data ?? [])?.map((integration) => {
    const {
      slug,
      categories,
      title,
      description,
      documentation_url: docsUrl,
      website_url: siteUrl,
      content,
      partner_name: authorName,
      partner_slug: partnerSlug,
      partner_logo: partnerLogo,
    } = integration

    const status = undefined
    const author = { name: authorName ?? '', websiteUrl: '' }

    return {
      id: slug ?? '',
      name: title ?? '',
      status,
      type: 'oauth' as const, // Currently marketplace only supports oauth apps
      categories: Array.isArray(categories)
        ? (categories as Array<{ slug: string }>).map((x) => x.slug)
        : [],
      content,
      files: [],
      description,
      docsUrl,
      siteUrl,
      author,
      requiredExtensions: [],
      icon: ({ className, ...props } = {}) => (
        <Image
          src={getIconUrl(partnerSlug ?? '', partnerLogo ?? '')}
          alt=""
          width={24}
          height={24}
        />
      ),
      navigation: [
        {
          route: 'overview',
          label: 'Overview',
        },
      ],
      navigate: ({ pageId = 'overview' }) => {
        switch (pageId) {
          case 'overview':
            return dynamic(
              () =>
                import('@/components/interfaces/Integrations/Integration/IntegrationOverviewTabV2/index').then(
                  (mod) => mod.IntegrationOverviewTabV2
                ),
              {
                loading: Loading,
              }
            )
          case 'secrets':
            return dynamic(
              () =>
                import('../Vault/Secrets/SecretsManagement').then((mod) => mod.SecretsManagement),
              {
                loading: Loading,
              }
            )
        }
        return null
      },
    }
  })

  // [Joshen] Existing integrations that are defined within studio
  // Available integrations are all integrations that can be installed. If an integration can't be installed (needed
  // extensions are not available on this DB image), the UI will provide a tooltip explaining why.
  const allIntegrations = useMemo(() => {
    return INTEGRATIONS.filter((integration) => {
      if (
        !integrationsWrappers &&
        (integration.type === 'wrapper' || integration.id.endsWith('_wrapper'))
      ) {
        return false
      }

      if (integration.id === 'stripe_sync_engine' && isCLI) {
        return false
      }

      return true
    })
  }, [integrationsWrappers, isCLI])

  const availableIntegrations = useMemo(
    () => allIntegrations.sort((a, b) => a.name.localeCompare(b.name)),
    [allIntegrations]
  )

  console.log(`MARKETPLACE INTEGRATIONS: ${JSON.stringify(marketplaceIntegrations)}`)

  return {
    data: [...marketplaceIntegrations, ...availableIntegrations],
    // data: [...marketplaceIntegrations],
    error,
    isPending,
    isSuccess,
    isError,
  }
}
