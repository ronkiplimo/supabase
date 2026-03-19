'use client'

import { Button, cn } from 'ui'

import { V2ProjectBranchSelector } from './V2ProjectBranchSelector'

export function TopBar() {
  return (
    <header
      className={cn(
        'h-11 md:h-12 flex items-center justify-between px-1.5 border-b border-border bg-dash-sidebar shrink-0'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <V2ProjectBranchSelector />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="default"
          size="tiny"
          className="text-muted-foreground border border-border rounded px-2 py-1 text-xs"
        >
          Search ⌘K
        </Button>
      </div>
    </header>
  )
}
