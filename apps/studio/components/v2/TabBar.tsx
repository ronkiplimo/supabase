'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { List, Plus, X } from 'lucide-react'
import { cn } from 'ui'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { useV2DashboardStore } from '@/stores/v2-dashboard'

const CATEGORY_LABELS: Record<string, string> = {
  tables: 'Tables',
  functions: 'Functions',
  types: 'Enumerated types',
  roles: 'Roles',
  extensions: 'Extensions',
  indexes: 'Indexes',
  publications: 'Publications',
  users: 'Users',
  providers: 'Providers',
  'oauth-apps': 'OAuth apps',
  buckets: 'Buckets',
  'edge-functions': 'Edge functions',
  channels: 'Channels',
}

export function TabBar() {
  const pathname = usePathname()
  const { projectRef } = useV2Params()
  const { detailTabs, removeDetailTab } = useV2DashboardStore()

  const base = projectRef ? `/v2/project/${projectRef}` : ''
  const pathParts = pathname?.replace(/^\/v2\/[^/]+\/[^/]+/, '').split('/').filter(Boolean) ?? []
  const activity = pathParts[0]
  const category = pathParts[1]
  const categoryLabel = category ? CATEGORY_LABELS[category] ?? category : 'Data'
  const categoryListHref = category ? `${base}/data/${category}` : `${base}/data/tables`

  const activeTabPath = pathname ?? ''

  return (
    <div className="flex items-center border-b border-border bg-background shrink-0 min-h-[36px]">
      <Link
        href={categoryListHref}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 text-sm border-r border-border',
          !pathname?.includes('/data/') && 'text-foreground',
          pathname === categoryListHref
            ? 'bg-sidebar-accent text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <List className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[120px]">{categoryLabel}</span>
      </Link>
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
        title={`New ${categoryLabel.toLowerCase().replace(/s$/, '')}`}
      >
        <Plus className="h-4 w-4" />
      </button>
      {detailTabs.map((tab) => {
        const isActive = activeTabPath === tab.path
        return (
          <div
            key={tab.id}
            className={cn(
              'group flex items-center gap-1 pl-2 pr-1 py-1.5 border-r border-border max-w-[180px]',
              isActive ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Link href={tab.path} className="flex-1 min-w-0 truncate text-sm">
              {tab.label}
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                removeDetailTab(tab.id)
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground"
              aria-label="Close tab"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
