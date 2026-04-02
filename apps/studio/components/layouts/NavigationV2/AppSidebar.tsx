import { Plug } from 'lucide-react'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { Button, cn, Sidebar, SidebarContent, SidebarHeader } from 'ui'

import { NavGroup } from './NavGroup'
import { useAppSidebarNavItems, type AppSidebarScope } from './useAppSidebarNavItems'
import { ConnectSheet } from '@/components/interfaces/ConnectSheet/ConnectSheet'
import { OrgSelector } from '@/components/layouts/Navigation/NavigationBar/OrgSelector'
import { ProjectBranchSelector } from '@/components/layouts/Navigation/NavigationBar/ProjectBranchSelector'
import { useHideSidebar } from '@/hooks/misc/useHideSidebar'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { IS_PLATFORM } from '@/lib/constants'

export type { AppSidebarScope }

type AppSidebarNavBodyVariant = 'desktop' | 'mobile-sheet'

interface AppSidebarNavBodyProps {
  scope?: AppSidebarScope
  variant?: AppSidebarNavBodyVariant
}

/**
 * Shared nav chrome (branch/org selector, Connect, NavGroups) for desktop sidebar and mobile sheet.
 */
function AppSidebarNavBody({ scope, variant = 'desktop' }: AppSidebarNavBodyProps) {
  const [, setShowConnect] = useQueryState('showConnect', parseAsBoolean.withDefault(false))
  const { data: selectedOrganization } = useSelectedOrganizationQuery()

  const {
    isProjectScope,
    isActiveHealthy,
    projectItems,
    databaseItems,
    platformItems,
    observabilityItems,
    integrationsItems,
    organizationItems,
  } = useAppSidebarNavItems({ scope })

  const showSelector = IS_PLATFORM && (isProjectScope || selectedOrganization)
  const isMobileSheet = variant === 'mobile-sheet'

  return (
    <>
      {showSelector && (
        <SidebarHeader className="hidden md:flex flex-col gap-2">
          {isProjectScope ? (
            <>
              <ProjectBranchSelector />
              <div className="flex items-center px-0.5">
                <Button
                  type="default"
                  size="small"
                  disabled={!isActiveHealthy}
                  onClick={() => setShowConnect(true)}
                  className="h-7 flex-1 justify-center gap-0 pl-2"
                  icon={<Plug className="rotate-90" strokeWidth={1.5} />}
                >
                  Connect
                </Button>
              </div>
            </>
          ) : (
            selectedOrganization && <OrgSelector />
          )}
        </SidebarHeader>
      )}
      <div
        className={cn(
          'relative min-h-0 flex-1',
          isMobileSheet ? 'overflow-y-auto' : 'overflow-hidden'
        )}
      >
        <SidebarContent className={cn('relative gap-0 pb-8', !isMobileSheet && 'h-full')}>
          {isProjectScope ? (
            <>
              <NavGroup id="project" label="Project" items={projectItems} />
              <NavGroup id="database" label="Database" items={databaseItems} />
              <NavGroup id="platform" label="Platform" items={platformItems} />
              <NavGroup id="observability" label="Observability" items={observabilityItems} />
              <NavGroup id="integrations" label="Integrations" items={integrationsItems} />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-sidebar to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-sidebar to-transparent"
              />
            </>
          ) : (
            <NavGroup id="organization" label="" items={organizationItems} isCollapsible={false} />
          )}
        </SidebarContent>
      </div>
    </>
  )
}

interface AppSidebarV2Props {
  scope?: AppSidebarScope
}

export function AppSidebarV2({ scope }: AppSidebarV2Props = {}) {
  const hideSidebar = useHideSidebar()

  return (
    <>
      {!hideSidebar && (
        <Sidebar
          collapsible="none"
          className="hidden md:flex h-full w-full border-r border-default group"
        >
          <AppSidebarNavBody scope={scope} variant="desktop" />
        </Sidebar>
      )}

      <ConnectSheet />
    </>
  )
}

/**
 * Full-height V2 navigation for `StudioMobileSheetNav`, opened via `registerOpenMenu` from
 * {@link ProjectLayoutV2}. Mirrors desktop {@link AppSidebarV2} structure.
 */
export function AppSidebarMobileSheetMenu() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-foreground">
      <AppSidebarNavBody scope="project" variant="mobile-sheet" />
      <ConnectSheet />
    </div>
  )
}
