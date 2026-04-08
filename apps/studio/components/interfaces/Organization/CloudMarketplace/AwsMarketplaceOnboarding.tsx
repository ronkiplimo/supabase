import {
  AwsMarketplaceOnboardingRouteApiProvider,
  type IAwsMarketplaceOnboardingRouteApi,
} from './AwsMarketplaceOnboarding.route'
import AwsMarketplaceContractNotLinkable from '@/components/interfaces/Organization/CloudMarketplace/AwsMarketplaceContractNotLinkable'
import AwsMarketplaceCreateNewOrg from '@/components/interfaces/Organization/CloudMarketplace/AwsMarketplaceCreateNewOrg'
import { AwsMarketplaceLinkExistingOrg } from '@/components/interfaces/Organization/CloudMarketplace/AwsMarketplaceLinkExistingOrg'
import AwsMarketplaceOnboardingPlaceholder from '@/components/interfaces/Organization/CloudMarketplace/AwsMarketplaceOnboardingPlaceholder'
import { useCloudMarketplaceContractLinkingEligibilityQuery } from '@/components/interfaces/Organization/CloudMarketplace/cloud-marketplace-query'
import {
  ScaffoldContainer,
  ScaffoldDivider,
  ScaffoldHeader,
  ScaffoldTitle,
} from '@/components/layouts/Scaffold'
import { useOrganizationsQuery } from '@/data/organizations/organizations-query'

export interface AwsMarketplaceOnboardingScreenProps {
  buyerId: string | Array<string> | undefined
}

export function AwsMarketplaceOnboardingScreen({
  buyerId,
  __routeApi,
}: AwsMarketplaceOnboardingScreenProps & {
  __routeApi: IAwsMarketplaceOnboardingRouteApi
}) {
  return (
    <AwsMarketplaceOnboardingRouteApiProvider {...__routeApi}>
      <AwsMarketplaceOnboardingScreenInner buyerId={buyerId} />
    </AwsMarketplaceOnboardingRouteApiProvider>
  )
}

function AwsMarketplaceOnboardingScreenInner({ buyerId }: AwsMarketplaceOnboardingScreenProps) {
  const {
    data: organizations,
    isFetched: isOrganizationsFetched,
    isSuccess: wasOrganizationsRequestSuccessful,
  } = useOrganizationsQuery()

  const {
    data: contractLinkingEligibility,
    isFetched: isContractLinkingEligibilityFetched,
    isSuccess: wasEligibilityRequestSuccessful,
  } = useCloudMarketplaceContractLinkingEligibilityQuery({
    buyerId: buyerId as string,
  })

  const renderContent = () => {
    if (!isOrganizationsFetched || !isContractLinkingEligibilityFetched) {
      return <AwsMarketplaceOnboardingPlaceholder />
    }

    if (!wasOrganizationsRequestSuccessful || !wasEligibilityRequestSuccessful) {
      return <p className="mt-4">Error loading AWS Marketplace setup page. Try again later.</p>
    }

    if (!contractLinkingEligibility.eligibility.is_eligible) {
      return (
        <AwsMarketplaceContractNotLinkable
          reason={contractLinkingEligibility.eligibility.reasons[0]}
        />
      )
    }

    if (organizations?.length) {
      return <AwsMarketplaceLinkExistingOrg buyerId={buyerId} organizations={organizations} />
    }

    return <AwsMarketplaceCreateNewOrg buyerId={buyerId} />
  }

  return (
    <ScaffoldContainer>
      <ScaffoldHeader>
        <ScaffoldTitle>AWS Marketplace Setup</ScaffoldTitle>
      </ScaffoldHeader>
      <ScaffoldDivider />
      {renderContent()}
    </ScaffoldContainer>
  )
}
