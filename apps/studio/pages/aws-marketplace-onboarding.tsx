import { useRouter } from 'next/router'

import { AwsMarketplaceOnboardingScreen } from '@/components/interfaces/Organization/CloudMarketplace/AwsMarketplaceOnboarding'
import LinkAwsMarketplaceLayout from '@/components/layouts/LinkAwsMarketplaceLayout'
import type { NextPageWithLayout } from '@/types'

const AwsMarketplaceOnboarding: NextPageWithLayout = () => {
  const {
    query: { buyer_id: buyerId },
    push,
  } = useRouter()

  return <AwsMarketplaceOnboardingScreen buyerId={buyerId} __routeApi={{ navigate: push }} />
}

AwsMarketplaceOnboarding.getLayout = (page) => (
  <LinkAwsMarketplaceLayout>{page}</LinkAwsMarketplaceLayout>
)

export default AwsMarketplaceOnboarding
