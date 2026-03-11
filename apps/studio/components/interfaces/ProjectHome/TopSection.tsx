import { ActivityStats } from 'components/interfaces/ProjectHome/ActivityStats'
import { ProjectConnectionHoverCard } from 'components/interfaces/ProjectHome/ProjectConnectionHoverCard'
import { ProjectPausedState } from 'components/layouts/ProjectLayout/PausedState/ProjectPausedState'
import { ComputeBadgeWrapper } from 'components/ui/ComputeBadgeWrapper'
import { InlineLink } from 'components/ui/InlineLink'
import { ProjectUpgradeFailedBanner } from 'components/ui/ProjectUpgradeFailedBanner'
import { useBranchesQuery } from 'data/branches/branches-query'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { useIsOrioleDb, useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { DOCS_URL, PROJECT_STATUS } from 'lib/constants'
import Link from 'next/link'
import { ReactFlowProvider } from 'reactflow'
import { Badge, cn, Skeleton, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import { InstanceConfiguration } from '../Settings/Infrastructure/InfrastructureConfiguration/InstanceConfiguration'

export const TopSection = () => {
  const isOrioleDb = useIsOrioleDb()
  const { data: project, isPending: isLoadingProject } = useSelectedProjectQuery()
  const { data: organization } = useSelectedOrganizationQuery()
  const { data: parentProject } = useProjectDetailQuery({ ref: project?.parent_project_ref })

  const { data: branches } = useBranchesQuery({
    projectRef: project?.parent_project_ref ?? project?.ref,
  })

  const mainBranch = branches?.find((branch) => branch.is_default)
  const currentBranch = branches?.find((branch) => branch.project_ref === project?.ref)
  const isMainBranch = currentBranch?.name === mainBranch?.name

  const isPaused = project?.status === PROJECT_STATUS.INACTIVE
  const projectName =
    currentBranch && !isMainBranch
      ? currentBranch.name
      : project?.name
        ? project.name
        : 'Welcome to your project'

  if (isPaused) {
    return <ProjectPausedState />
  }

  if (isLoadingProject) {
    return <TopSectionSkeleton />
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-0 w-full items-center">
        <div className="flex flex-col">
          <div className="flex flex-row flex-wrap items-center gap-4 w-full">
            <div>
              {!isMainBranch && (
                <Link
                  href={`/project/${parentProject?.ref}`}
                  className="text-sm text-foreground-light"
                >
                  {parentProject?.name}
                </Link>
              )}
              <div className="flex items-center gap-x-2">
                <h1 className="text-3xl">{projectName}</h1>
                <div className="flex items-center gap-x-2">
                  {isOrioleDb && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="warning">OrioleDB</Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start" className="max-w-80 text-center">
                        This project is using Postgres with OrioleDB which is currently in preview
                        and not suitable for production workloads. View our{' '}
                        <InlineLink href={`${DOCS_URL}/guides/database/orioledb`}>
                          documentation
                        </InlineLink>{' '}
                        for all limitations.
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <ComputeBadgeWrapper
                    projectRef={project?.ref}
                    slug={organization?.slug}
                    cloudProvider={project?.cloud_provider}
                    computeSize={project?.infra_compute_size}
                  />
                </div>
              </div>
              <ProjectConnectionHoverCard projectRef={project?.ref} />
            </div>
          </div>
          <div className="mt-8">
            <ActivityStats />
          </div>
        </div>
        <div>
          <div
            className={cn(
              'w-full h-[400px] md:h-[500px] border border-muted rounded-md overflow-hidden flex flex-col relative'
            )}
          >
            <ReactFlowProvider>
              <InstanceConfiguration diagramOnly />
            </ReactFlowProvider>
          </div>
        </div>
      </div>
      <ProjectUpgradeFailedBanner />
    </div>
  )
}

const TopSectionSkeleton = () => {
  return (
    <div className="flex flex-col gap-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-0 w-full items-center">
        <div className="flex flex-col">
          <div className="flex flex-row flex-wrap items-center gap-4 w-full">
            <div>
              <div className="flex items-center gap-x-2">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-5 w-64 mt-2" />
            </div>
          </div>
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 flex-wrap">
              <Skeleton className="h-[72px] w-full" />
              <Skeleton className="h-[72px] w-full" />
              <Skeleton className="h-[72px] w-full" />
              <Skeleton className="h-[72px] w-full" />
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="w-full h-[400px] md:h-[500px] rounded-md" />
        </div>
      </div>
    </div>
  )
}
