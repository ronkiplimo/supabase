'use client'

import { Loader2, Play } from 'lucide-react'
import { Button } from 'ui'

export interface SqlEditorToolbarProps {
  hasSelection: boolean
  isExecuting: boolean
  onRun: () => void
}

export function SqlEditorToolbar({ hasSelection, isExecuting, onRun }: SqlEditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <Button
        type="primary"
        size="tiny"
        disabled={isExecuting}
        onClick={onRun}
        icon={
          isExecuting ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Play size={14} strokeWidth={1.5} />
          )
        }
      >
        {isExecuting ? 'Running...' : hasSelection ? 'Run Selection' : 'Run'}
      </Button>
      <div className="flex items-center gap-2 text-xs text-foreground-lighter">
        <kbd className="px-1.5 py-0.5 rounded bg-surface-200 border text-[10px]">
          {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}
          +Enter
        </kbd>
        <span>to run</span>
      </div>
    </div>
  )
}
