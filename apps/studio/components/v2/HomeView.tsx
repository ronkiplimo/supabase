'use client'

import {
  parseConnectionsData,
  parseInfrastructureMetrics,
} from 'components/interfaces/Observability/DatabaseInfrastructureSection.utils'
import { SIDEBAR_KEYS } from 'components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { useInfraMonitoringAttributesQuery } from 'data/analytics/infra-monitoring-query'
import { getKeys, useAPIKeysQuery } from 'data/api-keys/api-keys-query'
import { useBranchesQuery } from 'data/branches/branches-query'
import { useMaxConnectionsQuery } from 'data/database/max-connections-query'
import { useProjectLintsQuery as useLints } from 'data/lint/lint-query'
import { useOrganizationsQuery } from 'data/organizations/organizations-query'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'
import dayjs from 'dayjs'
import { API_URL, IS_PLATFORM } from 'lib/constants'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useAdvisorStateSnapshot } from 'state/advisor-state'
import { useSidebarManagerSnapshot } from 'state/sidebar-manager-state'
import { Badge, Button, cn, copyToClipboard } from 'ui'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { useV2DashboardStore } from '@/stores/v2-dashboard'
import type { InfraMonitoringAttribute } from 'data/analytics/infra-monitoring-query'

const HomeViewInfrastructureDiagram = dynamic(
  () => import('./HomeViewInfrastructureDiagram').then((m) => m.HomeViewInfrastructureDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[200px] animate-pulse rounded-md bg-surface-200" aria-hidden />
    ),
  }
)

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

      {/* b) Infrastructure diagram */}
      <div className="h-[280px]">
        <div className="h-full border border-muted rounded-md overflow-hidden flex flex-col">
          <HomeViewInfrastructureDiagram />
        </div>
      </div>

      {/* c) Active issues */}
      <div>
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
          <div className="space-y-2">
            {issues.map((lint) => {
              const isError = lint.level === 'ERROR'
              const pillClass = isError
                ? 'bg-destructive-300 text-destructive border-destructive-500'
                : 'bg-transparent text-foreground-lighter border-border'

              return (
                <button
                  key={lint.cache_key}
                  type="button"
                  onClick={() => handleOpenLint(lint)}
                  className="w-full text-left flex items-start gap-3 rounded border border-border hover:bg-sidebar-accent/50 p-3"
                >
                  <span
                    className={cn('shrink-0 text-[10px] px-2 py-0.5 rounded border', pillClass)}
                  >
                    {lint.level}
                  </span>
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
        )}
      </div>

      {/* d) Project health metrics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-border rounded-md p-3">
          <div className="text-xs text-foreground-lighter">Connections</div>
          <div className="text-sm  mt-1">
            {connections.max > 0 ? `${connections.current}/${connections.max}` : '—'}
          </div>
        </div>
        <div className="border border-border rounded-md p-3">
          <div className="text-xs text-foreground-lighter">Memory</div>
          <div className="text-sm  mt-1">
            {metrics?.ram ? `${metrics.ram.current.toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="border border-border rounded-md p-3">
          <div className="text-xs text-foreground-lighter">Disk</div>
          <div className="text-sm  mt-1">
            {metrics?.disk ? `${metrics.disk.current.toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="border border-border rounded-md p-3">
          <div className="text-xs text-foreground-lighter">CPU</div>
          <div className="text-sm  mt-1">
            {metrics?.cpu ? `${metrics.cpu.current.toFixed(0)}%` : '—'}
          </div>
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

      {/* f) Quick actions */}
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

      {/* g) Connect */}
      <div className="border border-border rounded-md p-4">
        <h2 className="text-base  mb-3">Connect</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border rounded-md p-3">
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
          <div className="border border-border rounded-md p-3">
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
    </div>
  )
}
