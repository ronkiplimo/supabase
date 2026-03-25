'use client'

import { LINTER_LEVELS } from 'components/interfaces/Linter/Linter.constants'
import {
  parseConnectionsData,
  parseInfrastructureMetrics,
} from 'components/interfaces/Observability/DatabaseInfrastructureSection.utils'
import { SIDEBAR_KEYS } from 'components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { useInfraMonitoringAttributesQuery } from 'data/analytics/infra-monitoring-query'
import type { InfraMonitoringAttribute } from 'data/analytics/infra-monitoring-query'
import { getKeys, useAPIKeysQuery } from 'data/api-keys/api-keys-query'
import { useBranchesQuery } from 'data/branches/branches-query'
import { useMaxConnectionsQuery } from 'data/database/max-connections-query'
import { useProjectLintsQuery as useLints } from 'data/lint/lint-query'
import { useOrganizationsQuery } from 'data/organizations/organizations-query'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'
import dayjs from 'dayjs'
import { API_URL, IS_PLATFORM } from 'lib/constants'
import { AlertTriangle, CircleAlert, Info } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useAdvisorStateSnapshot } from 'state/advisor-state'
import { useSidebarManagerSnapshot } from 'state/sidebar-manager-state'
import { Badge, Button, cn, copyToClipboard } from 'ui'

import { HomeViewDataCountersRow } from './HomeViewDataCountersRow'
import { useV2DataCounts } from './useV2DataCounts'
import { useV2Params } from '@/app/v2/V2ParamsContext'
import { useV2DashboardStore } from '@/stores/v2-dashboard'

const HomeViewInfrastructureDiagram = dynamic(
  () => import('./HomeViewInfrastructureDiagram').then((m) => m.HomeViewInfrastructureDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[200px] animate-pulse rounded-md bg-surface-200" aria-hidden />
    ),
  }
)

function LintSeverityIcon({ level }: { level: string }) {
  const iconClass = 'size-4 shrink-0'
  const aria =
    level === LINTER_LEVELS.ERROR
      ? 'Error'
      : level === LINTER_LEVELS.WARN
        ? 'Warning'
        : 'Information'

  return (
    <span
      role="img"
      className="shrink-0 flex items-center justify-center"
      title={level}
      aria-label={`${aria} severity`}
    >
      {level === LINTER_LEVELS.ERROR ? (
        <CircleAlert className={cn(iconClass, 'text-destructive')} strokeWidth={1.5} aria-hidden />
      ) : level === LINTER_LEVELS.WARN ? (
        <AlertTriangle
          className={cn(iconClass, 'text-warning-600 dark:text-warning')}
          strokeWidth={1.5}
          aria-hidden
        />
      ) : (
        <Info className={cn(iconClass, 'text-foreground-lighter')} strokeWidth={1.5} aria-hidden />
      )}
    </span>
  )
}

function maskConnectionString(conn: string | null | undefined) {
  if (!conn) return ''
  // Try to mask `user:password@` parts.
  const match = conn.match(/^(.*:\/\/)([^:]+):([^@]+)(@.*)$/)
  if (match) {
    return `${match[1]}${match[2]}:****${match[4]}`
  }
  // Fallback: mask everything after first ':' before '@'
  return conn.replace(/:(.*)@/, ':****@')
}

export function HomeView() {
  const router = useRouter()
  const { projectRef, orgSlug } = useV2Params()

  const { data: project } = useProjectDetailQuery(
    { ref: projectRef },
    { enabled: Boolean(projectRef) }
  )

  const { data: organization } = useOrganizationsQuery({
    enabled: Boolean(orgSlug),
    select: (data) => data.find((o) => o.slug === orgSlug),
  })

  const parentRef = project?.parent_project_ref ?? projectRef
  const { data: branches } = useBranchesQuery(
    { projectRef: parentRef },
    { enabled: Boolean(parentRef) && IS_PLATFORM }
  )

  const mainBranch = branches?.find((b) => b.is_default)
  const currentBranch = branches?.find((b) => b.project_ref === projectRef)
  const branchName = currentBranch?.name ?? mainBranch?.name ?? 'main'
  const branchBadge = currentBranch?.is_default ? 'prod' : 'preview'

  const lintsQuery = useLints({ projectRef })
  const lints = lintsQuery.data ?? []
  const issues = lints.slice(0, 6)

  const now = dayjs()
  const startDate = now.subtract(1, 'day').toISOString()
  const endDate = now.toISOString()

  const attributes = useMemo<InfraMonitoringAttribute[]>(
    () => [
      'avg_cpu_usage',
      'ram_usage',
      'disk_fs_used_system',
      'disk_fs_used_wal',
      'pg_database_size',
      'disk_fs_size',
      'disk_io_consumption',
      'pg_stat_database_num_backends',
    ],
    []
  )

  const { data: infraData } = useInfraMonitoringAttributesQuery(
    {
      projectRef,
      attributes,
      startDate,
      endDate,
      interval: '1h',
    },
    { enabled: Boolean(projectRef) }
  )

  const { data: maxConnectionsData } = useMaxConnectionsQuery({
    projectRef,
    connectionString: project?.connectionString,
  })
  const counts = useV2DataCounts(projectRef)

  const metrics = parseInfrastructureMetrics(infraData)
  const connections = parseConnectionsData(infraData, maxConnectionsData)

  const { recentItems } = useV2DashboardStore((s) => ({ recentItems: s.recentItems }))
  const openDataTab = useV2DashboardStore((s) => s.openDataTab)

  const { openSidebar } = useSidebarManagerSnapshot()
  const { setSelectedItem } = useAdvisorStateSnapshot()

  const handleOpenLint = (lint: (typeof issues)[number]) => {
    if (!projectRef) return
    setSelectedItem(lint.cache_key, 'lint')
    openSidebar(SIDEBAR_KEYS.ADVISOR_PANEL)
  }

  const handleOpenRecent = (item: (typeof recentItems)[number]) => {
    if (!projectRef) return
    openDataTab({
      id: item.id,
      label: item.label,
      type: 'detail',
      category: item.category,
      domain: item.domain,
      path: item.path,
    })
    router.push(item.path)
  }

  const { data: apiKeys } = useAPIKeysQuery(
    { projectRef, reveal: false },
    { enabled: Boolean(projectRef) }
  )
  const { anonKey } = getKeys(apiKeys)

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-4">
      {/* a) Project header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-3xl font-semibold truncate">{project?.name ?? 'Project'}</div>
          <div className="text-sm text-foreground-lighter truncate">
            {organization?.name ?? orgSlug ?? ''}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="success">{branchName}</Badge>
            <Badge variant={branchBadge === 'prod' ? 'success' : 'default'}>{branchBadge}</Badge>
          </div>
          <div className="text-xs text-foreground-lighter whitespace-nowrap">
            {project?.region ? `${project.region} / ` : ''}
            {project?.infra_compute_size ? `${project.infra_compute_size} / ` : ''}
            {project?.dbVersion ? `PG ${project.dbVersion}` : 'Postgres —'}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {/* Infrastructure diagram */}
        <div className="h-[280px] lg:col-span-2">
          <div className="h-full border border-muted rounded-md overflow-hidden flex flex-col">
            <HomeViewInfrastructureDiagram />
          </div>
        </div>

        {/* Project health metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border bg-surface-100 rounded-md p-3">
            <div className="text-xs text-foreground-lighter">Connections</div>
            <div className="text-sm  mt-1">
              {connections.max > 0 ? `${connections.current}/${connections.max}` : '—'}
            </div>
          </div>
          <div className="border border-border bg-surface-100 rounded-md p-3">
            <div className="text-xs text-foreground-lighter">Memory</div>
            <div className="text-sm  mt-1">
              {metrics?.ram ? `${metrics.ram.current.toFixed(0)}%` : '—'}
            </div>
          </div>
          <div className="border border-border bg-surface-100 rounded-md p-3">
            <div className="text-xs text-foreground-lighter">Disk</div>
            <div className="text-sm  mt-1">
              {metrics?.disk ? `${metrics.disk.current.toFixed(0)}%` : '—'}
            </div>
          </div>
          <div className="border border-border bg-surface-100 rounded-md p-3">
            <div className="text-xs text-foreground-lighter">CPU</div>
            <div className="text-sm  mt-1">
              {metrics?.cpu ? `${metrics.cpu.current.toFixed(0)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      <HomeViewDataCountersRow projectRef={projectRef} counts={counts} />

      <div className="w-full grid lg:grid-cols-2 gap-3">
        {/* g) Connect */}
        <div className="border border-border bg-surface-100 rounded-md p-2">
          <h2 className="text-base mb-2">Connect</h2>
          <div className="flex flex-col gap-2">
            <div className="border border-border bg-alternative rounded-md p-3">
              <div className="text-xs text-foreground-lighter mb-1">Connection string</div>
              <div className="font-mono text-xs break-all">
                {maskConnectionString(project?.connectionString)}
              </div>
              <div className="mt-2">
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => copyToClipboard(project?.connectionString ?? '')}
                  disabled={!project?.connectionString}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="border border-border bg-alternative rounded-md p-3">
              <div className="text-xs text-foreground-lighter mb-1">API</div>
              <div className="font-mono text-xs break-all">{API_URL}</div>
              <div className="font-mono text-xs break-all mt-2">
                {anonKey?.api_key ? `anon: ${anonKey.api_key}` : 'anon: —'}
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="default" size="tiny" onClick={() => copyToClipboard(API_URL)}>
                  Copy URL
                </Button>
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => copyToClipboard(anonKey?.api_key ?? '')}
                  disabled={!anonKey?.api_key}
                >
                  Copy anon
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Active issues */}
        <div className="max-w-full max-h-[300px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base ">Active issues</h2>
            <span className="text-xs text-foreground-lighter">{issues.length} shown</span>
          </div>
          {lintsQuery.isPending ? (
            <div className="text-sm text-foreground-lighter">Loading issues…</div>
          ) : issues.length === 0 ? (
            <div className="text-sm text-foreground-lighter rounded border border-border p-3">
              No issues detected
            </div>
          ) : (
            <div className="border border-border rounded-md p-3 overflow-y-auto max-h-full">
              <div className="space-y-1">
                {issues.map((lint) => {
                  const pillStyle =
                    lint.level === LINTER_LEVELS.ERROR &&
                    'bg-destructive-200 border-destructive-500 text-destructive'
                  return (
                    <button
                      key={lint.cache_key}
                      type="button"
                      onClick={() => handleOpenLint(lint)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 rounded border border-border bg-surface-100 hover:bg-sidebar-accent/50 p-2',
                        pillStyle
                      )}
                    >
                      <LintSeverityIcon level={lint.level} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs  text-foreground truncate">
                          {lint.categories?.[0] ?? 'General'}
                        </div>
                        <div className="text-xs text-foreground-lighter truncate">
                          {lint.description ?? lint.detail}
                        </div>
                      </div>
                      <span className="text-xs text-foreground underline underline-offset-2 shrink-0">
                        View
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* e) Quick Access */}
      <div className="border border-border rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base ">Quick access</h2>
          <span className="text-xs text-foreground-lighter">{recentItems.length}/20</span>
        </div>
        {recentItems.length === 0 ? (
          <div className="text-sm text-foreground-lighter">
            Open a detail page to populate this list.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {recentItems.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenRecent(item)}
                className="text-left border border-border rounded-md p-3 hover:bg-sidebar-accent/50"
              >
                <div className="text-sm  truncate">{item.label}</div>
                <div className="text-xs text-foreground-lighter truncate">{item.category}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            title: '+ New table',
            href: projectRef ? `/v2/project/${projectRef}/data/tables` : '#',
          },
          {
            title: '+ New bucket',
            href: projectRef ? `/v2/project/${projectRef}/data/buckets` : '#',
          },
          {
            title: '+ New function',
            href: projectRef ? `/v2/project/${projectRef}/data/edge-functions` : '#',
          },
          {
            title: '+ Add user',
            href: projectRef ? `/v2/project/${projectRef}/data/users` : '#',
          },
        ].map((a) => (
          <button
            key={a.title}
            type="button"
            onClick={() => router.push(a.href)}
            className="border border-border rounded-md p-3 hover:bg-sidebar-accent/50 text-left"
          >
            <div className="text-sm ">{a.title}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
