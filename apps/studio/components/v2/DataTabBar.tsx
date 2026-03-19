'use client'

import { Plus, X } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from 'ui'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { useV2DashboardStore, type DataTab } from '@/stores/v2-dashboard'
import { TypeBadge } from './TypeBadge'

/** Returns the most specific (longest-path) tab that the current pathname is under. */
function useActiveTab(dataTabs: DataTab[], pathname: string | null): DataTab | null {
  if (!pathname) return null
  const matches = dataTabs.filter(
    (t) => pathname === t.path || pathname.startsWith(t.path + '/')
  )
  if (matches.length === 0) return null
  return matches.reduce((best, t) => (t.path.length > best.path.length ? t : best))
}

export function DataTabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { projectRef } = useV2Params()
  const { dataTabs, closeDataTab } = useV2DashboardStore()

  const activeTab = useActiveTab(dataTabs, pathname)
  const chooserPath = projectRef ? `/dashboard/v2/project/${projectRef}/data` : '#'

  const handleClose = (tab: DataTab, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    closeDataTab(tab.id)
    if (activeTab?.id === tab.id) {
      const remaining = dataTabs.filter((t) => t.id !== tab.id)
      if (remaining.length > 0) {
        const idx = dataTabs.indexOf(tab)
        const next = remaining[Math.min(idx, remaining.length - 1)]
        router.push(next.path)
      } else {
        router.push(chooserPath)
      }
    }
  }

  const isChooser = !activeTab && pathname !== null

  return (
    <div className="flex items-center border-b border-border bg-background shrink-0 min-h-[36px] overflow-x-auto">
      {dataTabs.map((tab) => {
        const isActive = activeTab?.id === tab.id
        return (
          <div
            key={tab.id}
            className={cn(
              'group relative flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 border-r border-border shrink-0 max-w-[200px] cursor-pointer select-none',
              isActive
                ? 'bg-background text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
            )}
            onClick={() => router.push(tab.path)}
          >
            <TypeBadge domain={tab.domain} type={tab.type} />
            <span className="flex-1 min-w-0 truncate text-xs">{tab.label}</span>
            <button
              type="button"
              onClick={(e) => handleClose(tab, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground shrink-0"
              aria-label={`Close ${tab.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}

      {/* "+" button — opens chooser */}
      <button
        type="button"
        onClick={() => router.push(chooserPath)}
        className={cn(
          'flex items-center justify-center w-8 h-[36px] shrink-0 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50',
          isChooser && 'text-foreground bg-sidebar-accent/50'
        )}
        title="Open data chooser"
        aria-label="Open data chooser"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
