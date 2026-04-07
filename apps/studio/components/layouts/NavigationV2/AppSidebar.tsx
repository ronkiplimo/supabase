import { useParams } from 'common'
import { Plug } from 'lucide-react'
import { useRouter } from 'next/router'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { Button, cn, Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from 'ui'
import { ShimmeringLoader } from 'ui-patterns'

import { NavGroup } from './NavGroup'
import { NavUser } from './NavUser'
import { useAppSidebarNavItems, type AppSidebarScope } from './useAppSidebarNavItems'
import { ConnectSheet } from '@/components/interfaces/ConnectSheet/ConnectSheet'
import { OrgSelector } from '@/components/layouts/Navigation/NavigationBar/OrgSelector'
import { ProjectBranchSelector } from '@/components/layouts/Navigation/NavigationBar/ProjectBranchSelector'
import { useOrganizationsQuery } from '@/data/organizations/organizations-query'
import { useProjectDetailQuery } from '@/data/projects/project-detail-query'
import { useHideSidebar } from '@/hooks/misc/useHideSidebar'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
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
  const { slug: orgRouteSlug } = useParams()
  const { data: selectedOrganization } = useSelectedOrganizationQuery()
  const { isPending: isLoadingOrganizations } = useOrganizationsQuery()
  const { data: project, isPending: isLoadingProject } = useSelectedProjectQuery()

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

  const isBranch = project != null && project.parentRef !== project.ref
  const { data: parentProject, isPending: isLoadingParentProject } = useProjectDetailQuery(
    { ref: project?.parent_project_ref },
    { enabled: Boolean(isProjectScope && isBranch && project?.parent_project_ref) }
  )
  const selectedProject = parentProject ?? project

  const isOrgSelectorLoading = isLoadingOrganizations
  const isProjectSelectorLoading =
    isLoadingProject || (isBranch && isLoadingParentProject) || !selectedProject

  const shouldShowOrgSelector =
    !isProjectScope && IS_PLATFORM && (Boolean(orgRouteSlug) || Boolean(selectedOrganization))

  const isHeaderLoading =
    (shouldShowOrgSelector && isOrgSelectorLoading) || (isProjectScope && isProjectSelectorLoading)

  const isMobileSheet = variant === 'mobile-sheet'
  const selectorHeaderClass = cn('flex-col gap-2', isMobileSheet ? 'flex' : 'hidden md:flex')

  return (
    <>
      <SidebarHeader className={selectorHeaderClass}>
        {isHeaderLoading ? (
          <ShimmeringLoader
            className={
              isProjectScope
                ? 'p-2 md:mr-2 md:w-[90px]'
                : cn('p-2 md:mr-2 w-[90px]', isMobileSheet && 'w-full max-w-none')
            }
          />
        ) : (
          <>
            {shouldShowOrgSelector && <OrgSelector />}
            {isProjectScope && (
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
            )}
          </>
        )}
      </SidebarHeader>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <SidebarContent
          className={cn(
            'min-h-0 flex-1 gap-0 pb-8',
            isMobileSheet ? 'overflow-y-auto' : 'h-full overflow-y-auto'
          )}
        >
          {isProjectScope ? (
            <>
              <NavGroup id="project" label="Project" items={projectItems} />
              <NavGroup id="database" label="Database" items={databaseItems} />
              <NavGroup id="platform" label="Platform" items={platformItems} />
              <NavGroup id="observability" label="Observability" items={observabilityItems} />
              <NavGroup id="integrations" label="Integrations" items={integrationsItems} />
            </>
          ) : (
            <NavGroup id="organization" label="" items={organizationItems} isCollapsible={false} />
          )}
        </SidebarContent>
        {isProjectScope ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-sidebar to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-sidebar to-transparent"
            />
          </>
        ) : null}
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
          <SidebarFooter>{IS_PLATFORM && <NavUser />}</SidebarFooter>
        </Sidebar>
      )}

      <ConnectSheet />
    </>
  )
}

/**
 * Full-height V2 navigation for `StudioMobileSheetNav`, opened via `registerOpenMenu` from
 * {@link ProjectLayoutV2}. Scope follows the current route like {@link DefaultLayoutV2}.
 */
export function AppSidebarMobileSheetMenu() {
  const router = useRouter()
  const sheetScope: AppSidebarScope = router.pathname.startsWith('/project')
    ? 'project'
    : 'organization'

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-foreground">
      <AppSidebarNavBody scope={sheetScope} variant="mobile-sheet" />
      <ConnectSheet />
    </div>
  )
}
