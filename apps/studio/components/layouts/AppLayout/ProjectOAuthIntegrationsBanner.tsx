import { LOCAL_STORAGE_KEYS } from 'common'
import { useAuthorizedAppsQuery } from 'data/oauth/authorized-apps-query'
import { useLocalStorageQuery } from 'hooks/misc/useLocalStorage'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { Plug, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Alert_Shadcn_, AlertDescription_Shadcn_, AlertTitle_Shadcn_, Button, cn } from 'ui'

import {
  getAuthorizedAppDisplayData,
  getConnectedAppsDescription,
  getConnectedAppsSentence,
  getMockAuthorizedApps,
  isProjectRoute,
} from './ProjectOAuthIntegrationsBanner.utils'

const OAUTH_BANNER_MOCK_QUERY_PARAM = 'oauthBannerMock'

export const ProjectOAuthIntegrationsBanner = () => {
  const router = useRouter()
  const { data: selectedOrganization } = useSelectedOrganizationQuery()
  const [mockAppsFromLocalStorage] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.OAUTH_INTEGRATIONS_BANNER_MOCK,
    ''
  )

  const organizationSlug = selectedOrganization?.slug
  const showProjectBanner = isProjectRoute({ pathname: router.pathname, asPath: router.asPath })
  const isMockingSupported = process.env.NEXT_PUBLIC_ENVIRONMENT !== 'prod'
  const mockAppsFromQuery = router.query[OAUTH_BANNER_MOCK_QUERY_PARAM]
  const mockValue =
    isMockingSupported && typeof mockAppsFromQuery !== 'undefined'
      ? mockAppsFromQuery
      : mockAppsFromLocalStorage
  const { apps: mockedAuthorizedApps, isMocked } = getMockAuthorizedApps(
    isMockingSupported ? mockValue : ''
  )

  const { data: authorizedAppsData = [], isError } = useAuthorizedAppsQuery(
    { slug: organizationSlug },
    { enabled: showProjectBanner && !!organizationSlug && !isMocked }
  )

  if (!showProjectBanner || !organizationSlug) return null
  if (!isMocked && isError) return null

  const authorizedApps = isMocked ? mockedAuthorizedApps : authorizedAppsData

  if (authorizedApps.length === 0) return null

  const displayApps = getAuthorizedAppDisplayData(authorizedApps)
  const appNames = displayApps.map((app) => app.name)
  const appIcon = displayApps.find((app) => app.icon)?.icon ?? null

  return (
    <Alert_Shadcn_
      variant="default"
      className="flex flex-wrap items-center gap-3 border-0 rounded-none border-b light:bg-background-200"
    >
      {/* Left */}
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {/* Oauth app icon or fallback icon */}
        <div
          className={cn(
            'h-5 w-5 rounded-full bg-no-repeat bg-cover bg-center border border-control flex items-center justify-center text-xs shrink-0',
            !appIcon && 'bg-surface-75'
          )}
          style={{ backgroundImage: appIcon ? `url('${appIcon}')` : 'none' }}
        >
          {!appIcon && <Plug size={12} />}
        </div>
        <div>
          <AlertTitle_Shadcn_>{getConnectedAppsSentence(appNames)}</AlertTitle_Shadcn_>
          <AlertDescription_Shadcn_>
            {getConnectedAppsDescription(appNames)}
          </AlertDescription_Shadcn_>
        </div>
      </div>
      {/* Right: button to manage oauth apps */}
      <Button asChild type="default" icon={<Settings2 />}>
        <Link href={`/org/${organizationSlug}/apps`}>Manage</Link>
      </Button>
    </Alert_Shadcn_>
  )
}
