'use client'

import { useMemo } from 'react'
import DataGrid, { type Column } from 'react-data-grid'
import type { QueryResult } from '../../adapters/types'

/** Accept both mutable and readonly QueryResult (valtio snapshots are readonly) */
type ReadonlyQueryResult = {
  readonly columns: readonly string[]
  readonly rows: readonly Record<string, unknown>[]
  readonly rowCount: number
  readonly error?: string
}

export interface SqlResultsPanelProps {
  result: QueryResult | ReadonlyQueryResult | null
  isExecuting: boolean
}

type Row = Record<string, unknown> & { __idx: number }

export function SqlResultsPanel({ result, isExecuting }: SqlResultsPanelProps) {
  if (isExecuting) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-foreground-lighter">
        Running query...
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-foreground-lighter">
        Click Run to execute your query
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-destructive-500 bg-destructive-200 p-3">
          <p className="text-sm font-mono text-destructive-600 whitespace-pre-wrap">
            {result.error}
          </p>
        </div>
      </div>
    )
  }

  if (result.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <p className="text-sm text-foreground-lighter">Success. No rows returned.</p>
        <p className="text-xs text-foreground-muted">{result.rowCount} rows affected</p>
      </div>
    )
  }

  return <ResultsGrid result={result} />
}

function ResultsGrid({ result }: { result: QueryResult | ReadonlyQueryResult }) {
  const rows: Row[] = useMemo(
    () => result.rows.map((row, idx) => ({ ...row, __idx: idx })),
    [result.rows]
  )

  const columns: Column<Row>[] = useMemo(
    () =>
      result.columns.map((col) => ({
        key: col,
        name: col,
        resizable: true,
        minWidth: 80,
        width: Math.min(Math.max(col.length * 10, 100), 300),
        renderCell: ({ row }) => <CellValue value={row[col]} />,
      })),
    [result.columns]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <DataGrid
          columns={columns}
          rows={rows}
          rowKeyGetter={(row) => row.__idx}
          className="h-full"
          style={{ blockSize: '100%' }}
        />
      </div>
      <div className="flex items-center px-4 py-1.5 border-t text-xs text-foreground-lighter">
        {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} returned
      </div>
    </div>
  )
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-foreground-lighter italic">NULL</span>
  }
  if (typeof value === 'object') {
    return <span className="font-mono text-xs">{JSON.stringify(value)}</span>
  }
  return <span>{String(value)}</span>
}
