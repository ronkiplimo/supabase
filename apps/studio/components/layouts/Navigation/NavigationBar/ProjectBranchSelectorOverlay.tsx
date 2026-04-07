import type { ReactNode } from 'react'
import { Popover_Shadcn_, PopoverAnchor_Shadcn_, PopoverContent_Shadcn_ } from 'ui'

import { ProjectBranchSelectorPopover } from './ProjectBranchSelectorPopover'

export interface ProjectBranchSelectorOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  showOrganizationColumn?: boolean
  anchor: ReactNode
}

export function ProjectBranchSelectorOverlay({
  open,
  onOpenChange,
  showOrganizationColumn = true,
  anchor,
}: ProjectBranchSelectorOverlayProps) {
  return (
    <Popover_Shadcn_ open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverAnchor_Shadcn_ asChild>{anchor}</PopoverAnchor_Shadcn_>
      <PopoverContent_Shadcn_
        className="w-[min(520px,calc(100vw-1.5rem))] p-0"
        side="bottom"
        align="start"
      >
        <ProjectBranchSelectorPopover
          showOrganizationColumn={showOrganizationColumn}
          onClose={() => onOpenChange(false)}
        />
      </PopoverContent_Shadcn_>
    </Popover_Shadcn_>
  )
}
