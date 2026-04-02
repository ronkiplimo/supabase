import { Plug } from 'lucide-react'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { Button, Sidebar, SidebarContent, SidebarHeader } from 'ui'

import { NavGroup } from './NavGroup'
import { useAppSidebarNavItems, type AppSidebarScope } from './useAppSidebarNavItems'
import { ConnectSheet } from '@/components/interfaces/ConnectSheet/ConnectSheet'
import { OrgSelector } from '@/components/layouts/Navigation/NavigationBar/OrgSelector'
import { ProjectBranchSelector } from '@/components/layouts/Navigation/NavigationBar/ProjectBranchSelector'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { IS_PLATFORM } from '@/lib/constants'

export type { AppSidebarScope }

interface AppSidebarV2Props {
  scope?: AppSidebarScope
}

export function AppSidebarV2({ scope }: AppSidebarV2Props = {}) {
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

  return (
    <>
      <Sidebar
        collapsible="none"
        className="hidden md:flex h-full w-full border-r border-default group"
      >
        <SidebarHeader className="gap-2">
          <div className="space-y-2">
            {showSelector &&
              (isProjectScope ? (
                <ProjectBranchSelector />
              ) : (
                selectedOrganization && <OrgSelector />
              ))}
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
          </div>
        </SidebarHeader>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <SidebarContent className="h-full gap-0 pb-8">
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
              <NavGroup
                id="organization"
                label=""
                items={organizationItems}
                isCollapsible={false}
              />
            )}
          </SidebarContent>
        </div>
      </Sidebar>

      <ConnectSheet />
    </>
  )
}
