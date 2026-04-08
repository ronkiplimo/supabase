import { routeApiContextFactory, type ExtractNavigationFunction } from '@/state/router-context'

const AwsMarketplaceOnboardingRouteApi = routeApiContextFactory()
export const {
  Provider: AwsMarketplaceOnboardingRouteApiProvider,
  useRouteApi: useAwsMarketplaceOnboardingRouteApi,
} = AwsMarketplaceOnboardingRouteApi
export type IAwsMarketplaceOnboardingRouteApi = ExtractNavigationFunction<
  typeof AwsMarketplaceOnboardingRouteApi
>
