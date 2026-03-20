'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

import { TableGridEditor } from 'components/interfaces/TableGridEditor/TableGridEditor'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { useV2DashboardStore } from '@/stores/v2-dashboard'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'
import { useTableEditorQuery } from 'data/table-editor/table-editor-query'

export function V2TableDetailView({ subTab }: { subTab: string }) {
  const params = useParams()
  const { projectRef } = useV2Params()
  const openDataTab = useV2DashboardStore((s) => s.openDataTab)
  const tableId = params?.tableId as string
  const id = tableId ? Number(tableId) : undefined

  const { data: project, isPending: isProjectPending } = useProjectDetailQuery(
    { ref: projectRef },
    { enabled: Boolean(projectRef) }
  )
  const connectionString = project?.connectionString

  const { data: table, isPending: isTablePending, isError } = useTableEditorQuery(
    { projectRef, connectionString, id },
    {
      // Wait for the project (and its connectionString) before running the SQL query.
      // Without a valid connectionString the query returns null and the loader never clears.
      enabled:
        Boolean(projectRef) &&
        Boolean(connectionString) &&
        typeof id === 'number' &&
        !Number.isNaN(id),
    }
  )

  const isPending = isProjectPending || isTablePending

  // Register this detail tab once we know the table name
  useEffect(() => {
    if (!table || !projectRef || !tableId) return
    openDataTab({
      id: `tables-${tableId}`,
      label: table.name,
      type: 'detail',
      category: 'tables',
      domain: 'db',
      path: `/v2/project/${projectRef}/data/tables/${tableId}/data`,
    })
  }, [table, projectRef, tableId, openDataTab])

  if (isError) {
    return (
      <div className="p-4 text-destructive text-sm">Failed to load table.</div>
    )
  }
  if (isPending || !table) {
    return <ShimmeringLoader className="m-4 h-8 rounded" />
  }

  if (subTab === 'data') {
    return (
      <div className="h-full min-h-0">
        <TableGridEditor isLoadingSelectedTable={isPending} selectedTable={table} variant="v2" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-medium text-foreground mb-2">
        {table.schema}.{table.name} — {subTab}
      </h2>
      <p className="text-sm text-muted-foreground">
        Content for {subTab} will use existing components (e.g. data grid, schema editor, policy editor).
      </p>
    </div>
  )
}
