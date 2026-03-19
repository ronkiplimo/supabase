'use client'

import { MobileSheetProvider } from 'components/layouts/Navigation/NavigationBar/MobileSheetContext'
import { LayoutSidebar } from 'components/layouts/ProjectLayout/LayoutSidebar'
import { usePathname } from 'next/navigation'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, SidebarProvider } from 'ui'

import { LeftActivityBar } from './ActivityBar'
import { BrowserPanel } from './BrowserPanel'
import { EditorFrame } from './EditorFrame'
import { RightActivityBar } from './RightActivityBar'
import { TopBar } from './TopBar'
import { V2LayoutSidebarProvider } from './V2LayoutSidebarProvider'
import { useV2Params } from '@/app/v2/V2ParamsContext'
import { V2DashboardProvider } from '@/stores/v2-dashboard'

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { projectRef } = useV2Params()

  const isHomeActive =
    Boolean(projectRef) &&
    pathname?.endsWith(`/${projectRef}`) &&
    !pathname?.includes('/data') &&
    !pathname?.includes('/obs/') &&
    !pathname?.includes('/settings/')

  // Data activity also hides the browser panel (Figma tab model)
  const isDataActivity =
    Boolean(projectRef) &&
    Boolean(pathname?.includes('/data/') || pathname?.endsWith('/data'))

  const hideBrowser = isHomeActive || isDataActivity

  return (
    <V2DashboardProvider>
      <SidebarProvider defaultOpen={false}>
        <MobileSheetProvider>
          <V2LayoutSidebarProvider>
            <div className="flex flex-col h-screen w-screen bg-dash-sidebar text-foreground">
              <TopBar />
              <div className="flex flex-1 min-h-0">
                <LeftActivityBar />
                <ResizablePanelGroup
                  orientation="horizontal"
                  className="h-full w-full overflow-x-hidden flex-1 flex flex-row gap-0"
                  autoSaveId={hideBrowser ? 'v2-shell-content-wide' : 'v2-shell-content'}
                >
                  {!hideBrowser && (
                    <>
                      <ResizablePanel
                        id="panel-browser"
                        minSize={200}
                        maxSize={400}
                        defaultSize={'240px'}
                      >
                        <BrowserPanel />
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                    </>
                  )}
                  <ResizablePanel
                    id="panel-content"
                    // minSize={isHomeActive ? 55 : 35}
                    // defaultSize={isHomeActive ? 70 : 80}
                  >
                    <main className="flex-1 min-w-0 flex flex-col overflow-hidden h-full">
                      <EditorFrame>{children}</EditorFrame>
                    </main>
                  </ResizablePanel>
                  <LayoutSidebar minSize={300} maxSize={500} defaultSize={340} />
                </ResizablePanelGroup>
                <RightActivityBar />
              </div>
            </div>
          </V2LayoutSidebarProvider>
        </MobileSheetProvider>
      </SidebarProvider>
    </V2DashboardProvider>
  )
}
