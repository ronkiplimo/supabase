import { useBreakpoint, useParams } from 'common'
import { AppBannerWrapper } from 'components/interfaces/App/AppBannerWrapper'
import { MobileSheetProvider } from 'components/layouts/Navigation/NavigationBar/MobileSheetContext'
import { StudioMobileSheetNav } from 'components/layouts/Navigation/NavigationBar/StudioMobileSheetNav'
import { LayoutSidebarProvider } from 'components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { ProjectContextProvider } from 'components/layouts/ProjectLayout/ProjectContext'
import { BannerStack } from 'components/ui/BannerStack/BannerStack'
import { BannerStackProvider } from 'components/ui/BannerStack/BannerStackProvider'
import { useRouter } from 'next/router'
import { PropsWithChildren } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, SidebarProvider } from 'ui'

import { AppSidebarV2 } from './AppSidebarV2'
import { RightRailLayout } from './RightIconRail'

export interface DefaultLayoutV2Props {
  headerTitle?: string
}

const contentMaxSizePercentage = 70
const leftSidebarMinSize = 220
const leftSidebarMaxSize = 450

/**
 * New three-column layout for the dashboard (V2 navigation).
 *
 * Layout structure:
 * 1. Left sidebar - navigation with groups (Database, Platform, Observability, Integrations)
 * 2. Main content area - page content (no secondary nav bar)
 * 3. Right icon rail - AI, SQL, Alerts, Help panels
 *
 * This replaces DefaultLayout + ProjectLayout + feature-specific layouts (AuthLayout, DatabaseLayout, etc.)
 * when the navigation V2 feature flag is enabled. The key difference is that there is no longer a
 * secondary product menu sidebar - all navigation is handled in the primary sidebar with collapsible groups.
 */
export const DefaultLayoutV2 = ({ children }: PropsWithChildren<DefaultLayoutV2Props>) => {
  const { ref } = useParams()
  const router = useRouter()
  const isMobile = useBreakpoint('md')
  const scope = router.pathname.startsWith('/project') ? 'project' : 'organization'
  const showLeftSidebar = !router.pathname.startsWith('/account') && !isMobile

  return (
    <ProjectContextProvider projectRef={ref}>
      <LayoutSidebarProvider>
        <MobileSheetProvider>
          <BannerStackProvider>
            <div className="flex h-screen w-screen flex-col overflow-hidden">
              <AppBannerWrapper />
              <RightRailLayout>
                <SidebarProvider defaultOpen={true} className="h-full min-h-0 overflow-hidden">
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
                        defaultSize={`${contentMaxSizePercentage}`}
                        className="h-full min-h-0 overflow-hidden"
                      >
                        <AppSidebarV2 scope={scope} />
                      </ResizablePanel>
                      <ResizableHandle withHandle className="hidden md:flex bg-background" />
                      <ResizablePanel
                        id="panel-v2-main-content"
                        minSize={`${100 - contentMaxSizePercentage}`}
                        // maxSize={`${100 - contentMinSizePercentage}`}
                        defaultSize={`${100 - contentMaxSizePercentage}`}
                        className="h-full min-h-0 min-w-0 overflow-hidden"
                      >
                        <div className="flex h-full min-h-0 flex-1 overflow-hidden">{children}</div>
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  ) : (
                    <div className="flex h-full min-h-0 flex-1 overflow-hidden">{children}</div>
                  )}
                </SidebarProvider>
              </RightRailLayout>
            </div>
            <BannerStack />
            <StudioMobileSheetNav />
          </BannerStackProvider>
        </MobileSheetProvider>
      </LayoutSidebarProvider>
    </ProjectContextProvider>
  )
}

export default DefaultLayoutV2
