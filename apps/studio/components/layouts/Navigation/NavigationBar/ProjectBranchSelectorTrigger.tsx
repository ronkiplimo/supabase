import { useIsNavigationV2Enabled } from 'components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { ChevronsUpDown, GitBranch } from 'lucide-react'
import { cn, SidebarMenuButton as SidebarMenuButtonComponent } from 'ui'
import { forwardRef } from 'react'

export interface ProjectBranchSelectorTriggerProps {
  displayProjectName: string
  selectedOrgInitial: string
  isBranch: boolean
  isProductionBranch: boolean
  branchDisplayName: string
  onGoToOrganization: () => void
}

export const ProjectBranchSelectorTrigger = React.forwardRef<
  React.ElementRef<typeof SidebarMenuButtonComponent>,
  ProjectBranchSelectorTriggerProps &
    Omit<
      React.ComponentPropsWithoutRef<typeof SidebarMenuButtonComponent>,
      keyof ProjectBranchSelectorTriggerProps
    >
>(({ displayProjectName, selectedOrgInitial, isBranch, branchDisplayName, ...buttonProps }, ref) => {
  const isNavigationV2 = useIsNavigationV2Enabled()

  return (
    <SidebarMenuButtonComponent
      ref={ref}
      size="lg"
      className="group py-1 gap-1.5 w-full flex h-auto text-left data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground touch-manipulation"
      {...buttonProps}
    >
      <div className="relative flex h-8 aspect-square shrink-0 items-center bg-background-muted group-hover:border-stronger justify-center rounded border border-strong text-xs">
        {selectedOrgInitial}
      </div>
      <div className="text-left flex-grow min-w-0">
        <div
          className={cn(
            'w-full truncate text-foreground leading-tight',
            !isNavigationV2 && 'max-w-[250px]'
          )}
        >
          {displayProjectName}
        </div>
        <div className="text-left flex-grow min-w-0">
          <div className="w-full truncate text-foreground leading-tight max-w-[250px]">
            {displayProjectName}
          </div>
          <div
            className={cn(
              'flex items-center gap-0.5',
              isBranch ? 'text-foreground-lighter' : 'text-warning'
            )}
          >
            <GitBranch className="shrink-0 size-3" strokeWidth={1.5} />
            <span className="truncate min-w-0 leading-tight text-xs">{branchDisplayName}</span>
          </div>
        </div>

      <ChevronsUpDown
        strokeWidth={1.5}
        className="ml-auto text-foreground-lighter !w-4 !h-4 md:hidden md:group-hover:flex"
      />
    </SidebarMenuButtonComponent>
  )
})
ProjectBranchSelectorTrigger.displayName = 'ProjectBranchSelectorTrigger'
