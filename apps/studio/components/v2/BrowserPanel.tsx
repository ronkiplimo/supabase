'use client'

import { ChevronRight, PanelLeftClose } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import { useV2DataCounts } from './useV2DataCounts'
import { useV2Params } from '@/app/v2/V2ParamsContext'
import { useV2DashboardStore } from '@/stores/v2-dashboard'

const DATA_GROUPS = [
  {
    id: 'data-database',
    label: 'Database',
    items: [
      { href: 'tables', label: 'Tables', countKey: 'tables' },
      { href: 'functions', label: 'Functions', countKey: 'functions' },
      { href: 'types', label: 'Enumerated types', countKey: 'types' },
      { href: 'roles', label: 'Roles', countKey: 'roles' },
      { href: 'extensions', label: 'Extensions', countKey: 'extensions' },
      { href: 'indexes', label: 'Indexes', countKey: 'indexes' },
      { href: 'publications', label: 'Publications', countKey: 'publications' },
    ],
  },
  {
    id: 'data-auth',
    label: 'Auth',
    items: [
      { href: 'users', label: 'Users', countKey: 'users' },
      { href: 'providers', label: 'Providers', countKey: 'providers' },
      { href: 'oauth-apps', label: 'OAuth apps', countKey: 'oauthApps' },
    ],
  },
  {
    id: 'data-storage',
    label: 'Storage',
    items: [{ href: 'buckets', label: 'Buckets', countKey: 'buckets' }],
  },
  {
    id: 'data-edge-functions',
    label: 'Edge functions',
    items: [{ href: 'edge-functions', label: 'Functions', countKey: 'edgeFunctions' }],
  },
  {
    id: 'data-realtime',
    label: 'Realtime',
    items: [{ href: 'channels', label: 'Channels', countKey: 'channels' }],
  },
]

const OBS_GROUPS = [
  {
    id: 'obs-logs',
    label: 'Log streams',
    items: [
      { href: 'logs', label: 'All logs' },
      { href: 'logs/api', label: 'API gateway' },
      { href: 'logs/postgres', label: 'Postgres' },
      { href: 'logs/auth', label: 'Auth' },
    ],
  },
  {
    id: 'obs-metrics',
    label: 'Metrics',
    items: [
      { href: 'metrics/connections', label: 'Connections' },
      { href: 'metrics/cpu', label: 'CPU' },
      { href: 'metrics/memory', label: 'Memory' },
      { href: 'metrics/disk', label: 'Disk' },
    ],
  },
  {
    id: 'obs-alerts',
    label: 'Alerts',
    items: [{ href: 'alerts', label: 'Active alerts' }],
  },
]

const SETTINGS_GROUPS = [
  {
    id: 'settings-project',
    label: 'Project',
    items: [
      { href: 'general', label: 'General' },
      { href: 'compute', label: 'Compute & disk' },
      { href: 'network', label: 'Network' },
      { href: 'api-keys', label: 'API keys' },
    ],
  },
  {
    id: 'settings-branches',
    label: 'Branches',
    items: [
      { href: 'branches', label: 'Branches' },
      { href: 'merge-requests', label: 'Merge requests' },
    ],
  },
  {
    id: 'settings-modules',
    label: 'Modules',
    items: [
      { href: 'auth', label: 'Auth config' },
      { href: 'storage', label: 'Storage config' },
      { href: 'functions', label: 'Functions config' },
      { href: 'realtime', label: 'Realtime config' },
    ],
  },
  {
    id: 'settings-org',
    label: 'Organization',
    items: [
      { href: 'members', label: 'Members' },
      { href: 'billing', label: 'Billing' },
    ],
  },
]

function getCount(counts: ReturnType<typeof useV2DataCounts>, key: string): number | string {
  switch (key) {
    case 'tables':
      return counts.tables
    case 'functions':
      return counts.functions
    case 'types':
      return counts.types
    case 'roles':
      return counts.roles
    case 'extensions':
      return counts.extensions
    case 'indexes':
      return '—'
    case 'publications':
      return counts.publications
    case 'users':
      return counts.users
    case 'providers':
    case 'oauthApps':
    case 'channels':
      return '—'
    case 'buckets':
      return counts.buckets
    case 'edgeFunctions':
      return counts.edgeFunctions
    default:
      return 0
  }
}

export function BrowserPanel({ onCollapse }: { onCollapse?: () => void }) {
  const pathname = usePathname()
  const { projectRef } = useV2Params()
  const { expandedGroups, toggleGroup } = useV2DashboardStore()
  const counts = useV2DataCounts(projectRef)

  const base = projectRef ? `/v2/project/${projectRef}` : ''
  const isData = pathname?.includes('/data/')
  const isObs = pathname?.includes('/obs/')
  const isSettings = pathname?.includes('/settings/')

  const title = isData ? 'Data' : isObs ? 'Observability' : isSettings ? 'Settings' : ''

  const groups = isData ? DATA_GROUPS : isObs ? OBS_GROUPS : isSettings ? SETTINGS_GROUPS : []

  return (
    <div className="w-full h-full flex flex-col border-r border-border bg-dash-sidebar">
      <div className="flex items-center justify-between pl-3 pr-2 py-1.5 border-b border-border shrink-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {onCollapse && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onCollapse}
                className="flex items-center justify-center w-6 h-6 rounded text-foreground-lighter hover:text-foreground hover:bg-sidebar-accent"
                aria-label="Collapse panel"
              >
                <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Collapse panel
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex-1 overflow-auto py-1">
        {groups.map((group) => {
          const isExpanded = expandedGroups[group.id] !== false
          return (
            <div key={group.id} className="py-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="group/browser-panel-collapsible flex items-center justify-between w-full px-3 py-1.5 text-left font-mono uppercase text-xs text-foreground-lighter hover:text-foreground-light hover:bg-sidebar-accent gap-2"
              >
                <span className="truncate">{group.label}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {/* <span
                    className={cn('h-1.5 w-1.5 rounded-full', getStatusClass(status))}
                    aria-label={`${status} status`}
                  /> */}
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform text-foreground-muted group-hover/browser-panel-collapsible:text-foreground-light',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </span>
              </button>
              {isExpanded &&
                group.items.map((item) => {
                  const itemHref = isData
                    ? `${base}/data/${item.href}`
                    : isObs
                      ? `${base}/obs/${item.href}`
                      : `${base}/settings/${item.href}`
                  const isActive = pathname === itemHref || pathname?.startsWith(itemHref + '/')
                  return (
                    <Link
                      key={item.href}
                      href={itemHref}
                      className={cn(
                        'flex items-center justify-between pl-8 pr-4 py-1.5 text-sm',
                        isActive
                          ? 'bg-sidebar-accent text-foreground font-medium'
                          : 'text-foreground-light hover:text-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {'countKey' in item && (
                        <span className="text-xs text-foreground-muted shrink-0">
                          {getCount(counts, String(item.countKey))}
                        </span>
                      )}
                    </Link>
                  )
                })}
            </div>
          )
        })}
        {isData && (
          <div className="px-3 py-2 mt-2">
            <Link href="#" className="text-xs text-foreground-muted hover:text-foreground">
              + Add module
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
