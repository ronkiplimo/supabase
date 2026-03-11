import PartnerIcon from 'components/ui/PartnerIcon'
import { useAwsRedirectQuery } from 'data/integrations/aws-redirect-query'
import { useVercelRedirectQuery } from 'data/integrations/vercel-redirect-query'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { withAuth } from 'hooks/misc/withAuth'
import { MANAGED_BY } from 'lib/constants/infrastructure'
import { ExternalLink } from 'lucide-react'
import { type PropsWithChildren } from 'react'
import { Alert_Shadcn_, AlertDescription_Shadcn_, AlertTitle_Shadcn_, Button, cn } from 'ui'

type MarketplaceBannerRedirectSource = 'vercel' | 'aws'

type MarketplaceBannerConfig = {
  title: string
  description: string
  redirectSource: MarketplaceBannerRedirectSource
}

const MARKETPLACE_BANNER_CONFIG: Record<
  typeof MANAGED_BY.VERCEL_MARKETPLACE | typeof MANAGED_BY.AWS_MARKETPLACE,
  MarketplaceBannerConfig
> = {
  [MANAGED_BY.VERCEL_MARKETPLACE]: {
    title: 'This organization is managed via Vercel Marketplace',
    description: 'Billing and some organization access settings are managed in Vercel.',
    redirectSource: 'vercel',
  },
  [MANAGED_BY.AWS_MARKETPLACE]: {
    title: 'This organization is billed via AWS Marketplace',
    description: 'Changes to billing and payment details must be made in AWS.',
    redirectSource: 'aws',
  },
}

function getMarketplaceBannerConfig(managedBy?: string): MarketplaceBannerConfig | undefined {
  switch (managedBy) {
    case MANAGED_BY.VERCEL_MARKETPLACE:
      return MARKETPLACE_BANNER_CONFIG[MANAGED_BY.VERCEL_MARKETPLACE]
    case MANAGED_BY.AWS_MARKETPLACE:
      return MARKETPLACE_BANNER_CONFIG[MANAGED_BY.AWS_MARKETPLACE]
    // [Danny] API-928 will add Stripe-specific banner behavior here.
    default:
      return undefined
  }
}

const OrganizationLayoutContent = ({ children }: PropsWithChildren) => {
  const { data: selectedOrganization } = useSelectedOrganizationQuery()

  const vercelQuery = useVercelRedirectQuery(
    {
      installationId: selectedOrganization?.partner_id,
    },
    {
      enabled: selectedOrganization?.managed_by === MANAGED_BY.VERCEL_MARKETPLACE,
    }
  )

  const awsQuery = useAwsRedirectQuery(
    {
      organizationSlug: selectedOrganization?.slug,
    },
    {
      enabled: selectedOrganization?.managed_by === MANAGED_BY.AWS_MARKETPLACE,
    }
  )

  const bannerConfig = getMarketplaceBannerConfig(selectedOrganization?.managed_by)

  const selectedRedirectQuery = (() => {
    if (!bannerConfig) return undefined

    switch (bannerConfig.redirectSource) {
      case 'aws':
        return awsQuery
      case 'vercel':
        return vercelQuery
      default:
        return undefined
    }
  })()

  return (
    <div className={cn('h-full w-full flex flex-col overflow-hidden')}>
      {selectedOrganization && bannerConfig && (
        <Alert_Shadcn_
          variant="default"
          className="flex items-center gap-4 border-t-0 border-x-0 rounded-none"
        >
          <PartnerIcon organization={selectedOrganization} showTooltip={false} size="medium" />
          <div className="flex-1">
            <AlertTitle_Shadcn_>{bannerConfig.title}</AlertTitle_Shadcn_>
            <AlertDescription_Shadcn_>{bannerConfig.description}</AlertDescription_Shadcn_>
          </div>
          <Button
            asChild
            type="default"
            iconRight={<ExternalLink />}
            disabled={!selectedRedirectQuery?.isSuccess}
          >
            <a href={selectedRedirectQuery?.data?.url} target="_blank" rel="noopener noreferrer">
              Manage
            </a>
          </Button>
        </Alert_Shadcn_>
      )}
      <main className="h-full w-full overflow-y-auto flex flex-col">{children}</main>
    </div>
  )
}

const OrganizationLayout = ({ children }: PropsWithChildren) => {
  return <OrganizationLayoutContent>{children}</OrganizationLayoutContent>
}

export default withAuth(OrganizationLayout)
