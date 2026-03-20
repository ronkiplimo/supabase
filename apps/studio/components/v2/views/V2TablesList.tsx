'use client'

import type { PostgresTable } from '@supabase/postgres-meta'
import { useSchemasQuery } from 'data/database/schemas-query'
import { isValidConnString } from 'data/fetchers'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'
import { useTablesQuery } from 'data/tables/tables-query'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  Input,
  Select_Shadcn_,
  SelectContent_Shadcn_,
  SelectItem_Shadcn_,
  SelectTrigger_Shadcn_,
  SelectValue_Shadcn_,
} from 'ui'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { DataListGrid, type DataListColumnDef } from '@/components/v2/DataListGrid'
import { useV2DashboardStore } from '@/stores/v2-dashboard'

export function V2TablesList() {
  const { projectRef } = useV2Params()
  const openDataTab = useV2DashboardStore((s) => s.openDataTab)
  const [schema, setSchema] = useState('public')
  const [search, setSearch] = useState('')

  const { data: project, isPending: isProjectPending } = useProjectDetailQuery(
    { ref: projectRef },
    { enabled: Boolean(projectRef) }
  )

  const shouldFetch = Boolean(projectRef) && isValidConnString(project?.connectionString)

  const { data: schemas } = useSchemasQuery(
    { projectRef, connectionString: project?.connectionString },
    { enabled: shouldFetch }
  )
  const {
    data: tables,
    isPending: isTablesPending,
    isError: isTablesError,
  } = useTablesQuery(
    {
      projectRef,
      connectionString: project?.connectionString,
      schema,
      includeColumns: false,
    },
    { enabled: shouldFetch }
  )

  const filtered = useMemo(() => {
    if (!Array.isArray(tables)) return []
    if (!search.trim()) return tables
    const q = search.toLowerCase()
    return tables.filter((t) => t.name.toLowerCase().includes(q))
  }, [tables, search])

  const base = projectRef ? `/v2/project/${projectRef}` : ''

  const openTable = useCallback(
    (table: PostgresTable) => {
      const path = `${base}/data/tables/${table.id}/data`
      openDataTab({
        id: `tables-${table.id}`,
        label: table.name,
        type: 'detail',
        category: 'tables',
        domain: 'db',
        path,
      })
    },
    [base, openDataTab]
  )

  const columns = useMemo<DataListColumnDef<PostgresTable>[]>(
    () => [
      {
        key: 'name',
        name: 'Name',
        minWidth: 220,
        sortValue: (row) => row.name,
        renderCell: (row) => (
          <Link
            href={`${base}/data/tables/${row.id}/data`}
            onClick={() => openTable(row)}
            className="truncate font-mono text-foreground hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        key: 'schema',
        name: 'Schema',
        minWidth: 140,
        sortValue: (row) => row.schema ?? schema,
        renderCell: (row) => (
          <span className="truncate text-foreground-lighter">{row.schema ?? schema}</span>
        ),
      },
      {
        key: 'rls',
        name: 'RLS',
        minWidth: 100,
        sortValue: (row) => (row.rls_enabled ? 1 : 0),
        renderCell: (row) =>
          row.rls_enabled ? (
            <Badge variant="success">On</Badge>
          ) : (
            <span className="text-foreground-lighter">Off</span>
          ),
      },
    ],
    [base, schema, openTable]
  )

  if (isTablesError) {
    return <div className="p-4 text-destructive text-sm">Failed to load tables.</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DataListGrid<PostgresTable>
        toolbar={
          <>
            <Select_Shadcn_ value={schema} onValueChange={setSchema}>
              <SelectTrigger_Shadcn_ className="h-8 w-[140px] text-xs">
                <SelectValue_Shadcn_ />
              </SelectTrigger_Shadcn_>
              <SelectContent_Shadcn_>
                {schemas?.map((s) => (
                  <SelectItem_Shadcn_ key={s.name} value={s.name}>
                    {s.name}
                  </SelectItem_Shadcn_>
                ))}
              </SelectContent_Shadcn_>
            </Select_Shadcn_>
            <Input
              placeholder="Filter tables…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 max-w-[240px] text-xs"
            />
          </>
        }
        toolbarTrailing={
          <>
            {Array.isArray(tables) ? tables.length : 0} table
            {Array.isArray(tables) && tables.length === 1 ? '' : 's'}
            {search.trim() ? ` · ${filtered.length} shown` : null}
          </>
        }
        columns={columns}
        rows={filtered}
        rowKeyGetter={(row) => row.id}
        isLoading={isProjectPending || !shouldFetch || isTablesPending}
        emptyMessage={search.trim() ? 'No tables match your filter.' : 'No tables in this schema.'}
        onRowDoubleClick={openTable}
      />
    </div>
  )
}
