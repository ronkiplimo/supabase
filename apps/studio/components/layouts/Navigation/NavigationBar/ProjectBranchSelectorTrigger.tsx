import { ChevronsUpDown, GitBranch } from 'lucide-react'
import * as React from 'react'
import {
  cn,
  SidebarMenuButton as SidebarMenuButtonComponent,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'ui'

import { getSelectedOrgInitial } from './ProjectBranchSelector.utils'
import type { Organization } from '@/types'

export interface ProjectBranchSelectorTriggerProps {
  displayProjectName: string
  selectedOrg: Organization | undefined
  isBranch: boolean
  isProductionBranch: boolean
  branchDisplayName: string
  onGoToOrganization: () => void
  isCollapsed?: boolean
}

export const ProjectBranchSelectorTrigger = React.forwardRef<
  React.ElementRef<typeof SidebarMenuButtonComponent>,
  ProjectBranchSelectorTriggerProps &
    Omit<
      React.ComponentPropsWithoutRef<typeof SidebarMenuButtonComponent>,
      keyof ProjectBranchSelectorTriggerProps
    >
>(
  (
    {
      displayProjectName,
      selectedOrg,
      isBranch,
      branchDisplayName,
      isCollapsed,
      className,
      ...buttonProps
    },
    ref
  ) => {
    const selectedOrgInitial = getSelectedOrgInitial(selectedOrg?.name ?? 'O')

    const collapsedTooltipContent = isCollapsed ? (
      <div className="flex min-w-[120px] max-w-[250px] items-start gap-1.5 text-left text-sm pr-1 text-foreground-light">
        <div className="relative flex aspect-square h-8 shrink-0 items-center justify-center rounded border border-strong bg-background-muted text-xs">
          {selectedOrgInitial}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="min-w-0 flex-grow text-left">
            <div className="w-full truncate leading-tight">{displayProjectName}</div>
            <div
              className={cn(
                'flex items-center gap-0.5',
                isBranch ? 'text-foreground-lighter' : 'text-warning'
              )}
            >
              <GitBranch className="size-3 shrink-0" strokeWidth={1.5} />
              <span className="min-w-0 truncate text-xs leading-tight">{branchDisplayName}</span>
            </div>
          </div>
        </div>
      </div>
    ) : null

    return (
      <SidebarMenuButtonComponent
        ref={ref}
        size="lg"
        hasIcon={!isCollapsed}
        tooltip={
          isCollapsed
            ? {
                children: collapsedTooltipContent,
                className: 'p-1 bg-sidebar',
              }
            : undefined
        }
        className={cn(
          'group/project-branch-selector !bg-transparent flex h-auto w-full touch-manipulation text-left data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-transparent',
          isCollapsed ? 'min-h-9 gap-1 !pl-0 !py-0.5 overflow-visible' : 'gap-1.5 pl-0 py-0.5',
          className
        )}
        {...buttonProps}
      >
        {!isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger>
                <div className="relative flex h-8 aspect-square shrink-0 items-center bg-background-muted group-hover/project-branch-selector:border-stronger justify-center rounded border border-strong text-xs">
                  {selectedOrgInitial}
                </div>
              </TooltipTrigger>
              <TooltipContent>{selectedOrg?.name}</TooltipContent>
            </Tooltip>
            <div className="text-left flex-grow min-w-0">
              <div className="text-left flex-grow min-w-0">
                <div
                  className={cn(
                    'w-full truncate leading-tight transition-colors text-foreground-light group-hover/project-branch-selector:text-foreground',
                    isCollapsed ? 'max-w-full min-w-0' : 'max-w-[250px]'
                  )}
                >
                  {displayProjectName}
                </div>
                <div
                  className={cn(
                    'flex items-center gap-0.5',
                    isBranch
                      ? 'text-foreground-lighter group-hover/project-branch-selector:text-foreground-light'
                      : 'text-warning'
                  )}
                >
                  <GitBranch className="shrink-0 size-3" strokeWidth={1.5} />
                  <span className="truncate min-w-0 leading-tight text-xs">
                    {branchDisplayName}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-1 rounded-md group-hover:bg-surface-200 hover:!bg-selection group-hover:text-foreground">
              <ChevronsUpDown
                strokeWidth={1.5}
                className={cn(
                  'ml-auto !h-4 !w-4 text-foreground-lighter group-hover:text-foreground-light',
                  isCollapsed && 'hidden'
                )}
              />
            </div>
          </>
        ) : (
          <div className="relative flex h-8 aspect-square shrink-0 items-center bg-background-muted group-hover:border-stronger justify-center rounded border border-strong text-xs">
            <ChevronsUpDown strokeWidth={1.5} className="!h-4 !w-4 text-foreground-lighter" />
          </div>
        )}
      </SidebarMenuButtonComponent>
    )
  }
)
ProjectBranchSelectorTrigger.displayName = 'ProjectBranchSelectorTrigger'
