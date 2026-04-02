import { useParams } from 'common'
import { Plug } from 'lucide-react'
import { useRouter } from 'next/router'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { Button, cn, Sidebar, SidebarHeader } from 'ui'
import { ShimmeringLoader } from 'ui-patterns'

import type { AppSidebarScope } from './app-sidebar.types'
import { ConnectSheet } from '@/components/interfaces/ConnectSheet/ConnectSheet'
import { SidebarContent as StudioSidebarNav } from '@/components/interfaces/Sidebar'
import { OrgSelector } from '@/components/layouts/Navigation/NavigationBar/OrgSelector'
import { ProjectBranchSelector } from '@/components/layouts/Navigation/NavigationBar/ProjectBranchSelector'
import { useOrganizationsQuery } from '@/data/organizations/organizations-query'
import { useProjectDetailQuery } from '@/data/projects/project-detail-query'
import { useHideSidebar } from '@/hooks/misc/useHideSidebar'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { IS_PLATFORM, PROJECT_STATUS } from '@/lib/constants'

export type { AppSidebarScope } from './app-sidebar.types'

type AppSidebarNavBodyVariant = 'desktop' | 'mobile-sheet'

interface AppSidebarNavBodyProps {
  scope?: AppSidebarScope
  variant?: AppSidebarNavBodyVariant
}

/**
 * Shared nav chrome (selectors, Connect) + V1 `SidebarContent` link tree for desktop and mobile sheet.
 */
function AppSidebarNavBody({ scope, variant = 'desktop' }: AppSidebarNavBodyProps) {
  const [, setShowConnect] = useQueryState('showConnect', parseAsBoolean.withDefault(false))
  const router = useRouter()
  const { slug: orgRouteSlug } = useParams()
  const { data: selectedOrganization } = useSelectedOrganizationQuery()
  const { isPending: isLoadingOrganizations } = useOrganizationsQuery()
  const { data: project, isPending: isLoadingProject } = useSelectedProjectQuery()

  const resolvedScope: AppSidebarScope =
    scope ?? (router.pathname.startsWith('/project') ? 'project' : 'organization')
  const isProjectScope = resolvedScope === 'project'
  const isActiveHealthy = project?.status === PROJECT_STATUS.ACTIVE_HEALTHY

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
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <StudioSidebarNav />
        </div>
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
