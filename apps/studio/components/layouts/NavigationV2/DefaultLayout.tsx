import { LOCAL_STORAGE_KEYS, useBreakpoint } from 'common'
import { AppBannerWrapper } from 'components/interfaces/App/AppBannerWrapper'
import MobileNavigationBar from 'components/layouts/Navigation/NavigationBar/MobileNavigationBar'
import { useLocalStorageQuery } from 'hooks/misc/useLocalStorage'
import { useRouter } from 'next/router'
import type { PropsWithChildren } from 'react'
import { useAppStateSnapshot } from 'state/app-state'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'ui'

import { DefaultLayoutProviders } from '../DefaultLayoutProviders'
import { AppSidebarV2 } from './AppSidebar'
import { LayoutHeader } from './LayoutHeader'
import { RightPanelToolbarLayout } from './RightPanelToolbar'

export interface DefaultLayoutV2Props {
  headerTitle?: string
  hideMobileMenu?: boolean
}

const leftSidebarMinSize = 160
const leftSidebarMaxSize = 450
const leftSidebarDefaultSize = '230px'

const mainContentClass = 'flex h-full min-h-0 min-w-0 flex-col overflow-hidden'

/**
 * V2 navigation shell: mobile bar, then AppSidebar (when shown) + main column. Main column has
 * LayoutHeader above the row of page content and right panel toolbar.
 */
export const DefaultLayoutV2 = ({
  children,
  headerTitle,
  hideMobileMenu,
}: PropsWithChildren<DefaultLayoutV2Props>) => {
  const router = useRouter()
  const isMobile = useBreakpoint('md')
  const appSnap = useAppStateSnapshot()
  const scope = router.pathname.startsWith('/project') ? 'project' : 'organization'
  const showLeftSidebar =
    !isMobile &&
    !router.pathname.startsWith('/account') &&
    !router.pathname.startsWith('/organizations')

  const [lastVisitedOrganization] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.LAST_VISITED_ORGANIZATION,
    ''
  )

  const backToDashboardURL = router.pathname.startsWith('/account')
    ? appSnap.lastRouteBeforeVisitingAccountPage.length > 0
      ? appSnap.lastRouteBeforeVisitingAccountPage
      : lastVisitedOrganization
        ? `/org/${lastVisitedOrganization}`
        : '/organizations'
    : undefined

  const header = (
    <LayoutHeader headerTitle={headerTitle} backToDashboardURL={backToDashboardURL} scope={scope} />
  )

  const contentRow = <RightPanelToolbarLayout>{children}</RightPanelToolbarLayout>

  const mainColumn = (
    <div className={mainContentClass}>
      <div className="shrink-0">{header}</div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{contentRow}</div>
    </div>
  )

  return (
    <DefaultLayoutProviders>
      <div className="flex h-screen w-screen flex-col">
        <AppBannerWrapper />
        <div className="shrink-0">
          <MobileNavigationBar
            hideMobileMenu={hideMobileMenu}
            backToDashboardURL={backToDashboardURL}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {showLeftSidebar ? (
            <ResizablePanelGroup
              orientation="horizontal"
              autoSaveId="default-layout-v2-left-sidebar"
              className="h-full w-full overflow-hidden"
            >
              <ResizablePanel
                id="panel-v2-left-sidebar"
                minSize={leftSidebarMinSize}
                maxSize={leftSidebarMaxSize}
                defaultSize={leftSidebarDefaultSize}
                className="h-full min-h-0 overflow-hidden"
              >
                <AppSidebarV2 scope={scope} />
              </ResizablePanel>
              <ResizableHandle withHandle className="hidden md:flex bg-background" />
              <ResizablePanel id="panel-v2-main-column" className={mainContentClass}>
                {mainColumn}
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            mainColumn
          )}
        </div>
      </div>
    </DefaultLayoutProviders>
  )
}

export default DefaultLayoutV2
