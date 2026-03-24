'use client'

import { Plus, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from 'ui'

import { TypeBadge } from './TypeBadge'
import { useV2Params } from '@/app/v2/V2ParamsContext'
import {
  CATEGORY_DOMAIN,
  CATEGORY_LABELS,
  useV2DashboardStore,
  type DataTab,
} from '@/stores/v2-dashboard'

/** Returns the most specific (longest-path) tab that the current pathname is under. */
function useActiveTab(dataTabs: DataTab[], pathname: string | null): DataTab | null {
  if (!pathname) return null
  const matches = dataTabs.filter((t) => pathname === t.path || pathname.startsWith(t.path + '/'))
  if (matches.length === 0) return null
  return matches.reduce((best, t) => (t.path.length > best.path.length ? t : best))
}

export function DataTabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { projectRef } = useV2Params()
  const { dataTabs, openDataTab, closeDataTab } = useV2DashboardStore()

  // Show tabs for any opened data view (list + detail)
  const visibleTabs = dataTabs.filter((t) => t.type === 'detail' || t.type === 'list')
  // Always call hooks before any early return
  const activeTab = useActiveTab(visibleTabs, pathname)
  const chooserPath = projectRef ? `/v2/project/${projectRef}/data` : '#'

  // Auto-register tabs for direct deep links to single-data list views (e.g. /data/users).
  useEffect(() => {
    if (!projectRef || !pathname) return

    const base = `/v2/project/${projectRef}/data/`
    if (!pathname.startsWith(base)) return

    const rest = pathname.slice(base.length)
    const [category] = rest.split('/')
    if (!category || category === 'tables') return
    if (!(category in CATEGORY_LABELS)) return

    openDataTab({
      id: category,
      label: CATEGORY_LABELS[category] ?? category,
      type: 'list',
      category,
      domain: CATEGORY_DOMAIN[category] ?? 'db',
      path: `${base}${category}`,
    })
  }, [projectRef, pathname, openDataTab])

  const closeTabAndRoute = (tab: DataTab) => {
    closeDataTab(tab.id)
    if (activeTab?.id === tab.id) {
      const remaining = visibleTabs.filter((t) => t.id !== tab.id)
      if (remaining.length > 0) {
        const idx = visibleTabs.indexOf(tab)
        const next = remaining[Math.min(idx, remaining.length - 1)]
        router.push(next.path)
      } else {
        router.push(chooserPath)
      }
    }
  }

  const handleClose = (
    tab: DataTab,
    e: Pick<React.MouseEvent, 'preventDefault' | 'stopPropagation'>
  ) => {
    e.preventDefault()
    e.stopPropagation()
    closeTabAndRoute(tab)
  }

  return (
    <div className="flex items-center border-b border-border bg-background shrink-0 min-h-[36px]">
      <div className="min-w-0 flex-1 overflow-x-auto h-full">
        <div className="flex items-center w-max min-w-full h-full">
          {visibleTabs.map((tab) => {
            const isActive = activeTab?.id === tab.id
            return (
              <div
                key={tab.id}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                className={cn(
                  'group relative flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 border-r border-border shrink-0 h-full max-w-[200px] cursor-pointer select-none',
                  isActive
                    ? 'bg-background text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                    : 'text-foreground-lighter hover:text-foreground hover:bg-sidebar-accent/50'
                )}
                onClick={() => router.push(tab.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(tab.path)
                  }
                }}
              >
                <TypeBadge domain={tab.domain} type={tab.type} />
                <span className="flex-1 min-w-0 truncate text-xs">{tab.label}</span>
                <button
                  type="button"
                  onClick={(e) => handleClose(tab, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-accent text-foreground-lighter hover:text-foreground shrink-0"
                  aria-label={`Close ${tab.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push(chooserPath)}
        className="shrink-0 h-full aspect-square flex items-center justify-center border-l border-border text-foreground-lighter hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
        aria-label="Open data chooser"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
