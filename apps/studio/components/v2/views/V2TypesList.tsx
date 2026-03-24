'use client'

import { useEnumeratedTypesQuery } from 'data/enumerated-types/enumerated-types-query'
import type { EnumeratedType } from 'data/enumerated-types/enumerated-types-query'
import { isValidConnString } from 'data/fetchers'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { DataTableRenderer } from '@/components/v2/DataTableRenderer'
import type { DataTableColumn } from '@/components/v2/DataTableRenderer'

const TYPES_COLUMNS: DataTableColumn<EnumeratedType>[] = [
  {
    id: 'name',
    name: 'Name',
    width: 200,
    minWidth: 120,
    renderCell: (_v, row) => <span className="font-mono text-xs text-foreground">{row.name}</span>,
  },
  {
    id: 'schema',
    name: 'Schema',
    width: 140,
    renderCell: (_v, row) => <span className="text-foreground-lighter">{row.schema}</span>,
  },
  {
    id: 'enums',
    name: 'Values',
    minWidth: 200,
    renderCell: (_v, row) => (
      <div className="flex flex-wrap gap-1 truncate">
        {(row.enums ?? []).slice(0, 5).map((e: string) => (
          <span
            key={e}
            className="rounded border border-border bg-surface-300 px-1 text-[11px] font-mono"
          >
            {e}
          </span>
        ))}
        {(row.enums ?? []).length > 5 && (
          <span className="text-[11px] text-foreground-lighter">+{row.enums.length - 5}</span>
        )}
      </div>
    ),
  },
]

export function V2TypesList() {
  const { projectRef } = useV2Params()

  const { data: project, isPending: isProjectPending } = useProjectDetailQuery(
    { ref: projectRef },
    { enabled: Boolean(projectRef) }
  )

  const shouldFetch = Boolean(projectRef) && isValidConnString(project?.connectionString)

  const {
    data: types,
    isPending: isTypesPending,
    isError,
    error,
  } = useEnumeratedTypesQuery(
    { projectRef, connectionString: project?.connectionString },
    { enabled: shouldFetch }
  )

  return (
    <DataTableRenderer<EnumeratedType>
      columns={TYPES_COLUMNS}
      rows={(types as EnumeratedType[]) ?? []}
      rowKey="id"
      isLoading={isProjectPending || (shouldFetch && isTypesPending)}
      error={isError ? (error as Error) : null}
      compact
      filters={[{ id: 'search', label: 'Search', type: 'search', placeholder: 'Filter types…' }]}
      emptyState={{ title: 'No enumerated types found' }}
    />
  )
}
