import { useBreakpoint } from 'common'
import { SqlEditor } from 'icons'
import { HelpCircle, Lightbulb } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useSidebarManagerSnapshot } from 'state/sidebar-manager-state'
import {
  AiIconAnimation,
  cn,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'ui'

import { useMobileSheet } from '../Navigation/NavigationBar/MobileSheetContext'
import { isSidebarId } from '../ProjectLayout/LayoutSidebar'
import { SIDEBAR_KEYS } from '../ProjectLayout/LayoutSidebar/LayoutSidebarProvider'

interface ToolbarItem {
  id: string
  label: string
  icon: (props: { isActive: boolean }) => ReactNode
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  {
    id: SIDEBAR_KEYS.AI_ASSISTANT,
    label: 'Assistant',
    icon: ({ isActive }) => (
      <AiIconAnimation
        allowHoverEffect={false}
        size={16}
        className={cn(isActive && 'text-foreground')}
      />
    ),
  },
  {
    id: SIDEBAR_KEYS.EDITOR_PANEL,
    label: 'Editor',
    icon: () => <SqlEditor size={18} strokeWidth={1.5} />,
  },
  {
    id: SIDEBAR_KEYS.ADVISOR_PANEL,
    label: 'Advisor',
    icon: () => <Lightbulb size={16} strokeWidth={1.5} />,
  },
  {
    id: SIDEBAR_KEYS.HELP_PANEL,
    label: 'Help & Support',
    icon: () => <HelpCircle size={16} strokeWidth={1.5} />,
  },
]

const RIGHT_SIDEBAR_MIN_SIZE_PERCENTAGE = 300
const RIGHT_SIDEBAR_DEFAULT_SIZE_PERCENTAGE = 340
const RIGHT_SIDEBAR_MAX_SIZE_PERCENTAGE = 750

function RightPanelToolbar() {
  const { activeSidebar, toggleSidebar } = useSidebarManagerSnapshot()

  const isMobile = useBreakpoint('md')
  const { content: sheetContent, setContent: setMobileSheetContent } = useMobileSheet()

  useEffect(() => {
    if (!isMobile) {
      setMobileSheetContent(null)
      return
    }
    if (activeSidebar?.component) {
      setMobileSheetContent(activeSidebar.id)
    } else if (isSidebarId(sheetContent)) {
      setMobileSheetContent(null)
    }
  }, [isMobile, activeSidebar, sheetContent, setMobileSheetContent])

  return (
    <aside className="bg-dash-sidebar text-foreground-lighter border-default flex w-10 shrink-0 border-l">
      <nav className="flex flex-1 flex-col items-center justify-start gap-1 p-1">
        {TOOLBAR_ITEMS.map((item) => {
          const isActive = activeSidebar?.id === item.id

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger>
                <button
                  type="button"
                  aria-label={item.label}
                  aria-pressed={isActive}
                  onClick={() => toggleSidebar(item.id)}
                  className={cn(
                    'inline-flex size-8 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-foreground text-background [&_svg]:text-background'
                      : 'hover:bg-surface-200 hover:text-foreground'
                  )}
                >
                  {item.icon({ isActive })}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </aside>
  )
}

function RightSidebarPanel() {
  const { activeSidebar } = useSidebarManagerSnapshot()

  if (!activeSidebar?.component) return null

  return (
    <aside className="bg-background border-default flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l">
      {activeSidebar.component()}
    </aside>
  )
}

export function RightPanelToolbarLayout({ children }: { children: ReactNode }) {
  const isMobile = useBreakpoint('md')
  const { activeSidebar } = useSidebarManagerSnapshot()
  const showRightSidebar = activeSidebar?.component !== undefined

  const main = <div className="h-full min-h-0 min-w-0 overflow-hidden">{children}</div>

  if (isMobile) {
    return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{main}</div>
  }

  if (showRightSidebar) {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup
          orientation="horizontal"
          autoSaveId="default-layout-v2-right-sidebar"
          className="min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          <ResizablePanel
            id="panel-v2-right-main-content"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            {main}
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-background" />
          <ResizablePanel
            id="panel-v2-right-sidebar"
            minSize={RIGHT_SIDEBAR_MIN_SIZE_PERCENTAGE}
            maxSize={RIGHT_SIDEBAR_MAX_SIZE_PERCENTAGE}
            defaultSize={RIGHT_SIDEBAR_DEFAULT_SIZE_PERCENTAGE}
            className="flex min-h-0 overflow-hidden bg-background"
          >
            <div className="flex h-full min-h-0 w-full min-w-0">
              <RightSidebarPanel />
              <RightPanelToolbar />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1">{main}</div>
      <div className="hidden shrink-0 md:flex">
        <RightPanelToolbar />
      </div>
    </div>
  )
}
