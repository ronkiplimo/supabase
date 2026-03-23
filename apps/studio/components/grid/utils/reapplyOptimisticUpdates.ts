import type { QueryClient } from '@tanstack/react-query'
import { tableRowKeys } from 'data/table-rows/keys'
import type { TableRowsData } from 'data/table-rows/table-rows-query'

import { applyCellEdit, applyRowAdd, markRowAsDeleted } from './queueOperationUtils'
import type { QueuedOperation } from '@/state/table-editor-operation-queue.types'
import { QueuedOperationType } from '@/state/table-editor-operation-queue.types'

interface ReapplyOptimisticUpdatesParams {
  queryClient: QueryClient
  projectRef: string
  tableId: number
  operations: readonly QueuedOperation[]
}

/**
 * Re-applies pending queue operations to cached row data after a refetch.
 * Kept in a dedicated module so App Router / Turbopack can resolve the export reliably.
 */
export function reapplyOptimisticUpdates({
  queryClient,
  projectRef,
  tableId,
  operations,
}: ReapplyOptimisticUpdatesParams) {
  const tableOperations = operations.filter((op) => op.tableId === tableId)
  if (tableOperations.length === 0) return

  const queryKey = tableRowKeys.tableRows(projectRef, { table: { id: tableId } })
  queryClient.setQueriesData<TableRowsData>({ queryKey }, (old) => {
    if (!old) return old

    let rows = [...old.rows]
    for (const operation of tableOperations) {
      switch (operation.type) {
        case QueuedOperationType.EDIT_CELL_CONTENT: {
          const { rowIdentifiers, columnName, newValue } = operation.payload
          rows = applyCellEdit(rows, columnName, rowIdentifiers, newValue)
          break
        }
        case QueuedOperationType.ADD_ROW: {
          const { tempId, rowData } = operation.payload
          // Derive idx from tempId (tempId is stringified negative timestamp)
          const idx = Number(tempId)
          rows = applyRowAdd(rows, tempId, idx, rowData)
          break
        }
        case QueuedOperationType.DELETE_ROW: {
          const { rowIdentifiers } = operation.payload
          rows = markRowAsDeleted(rows, rowIdentifiers)
          break
        }
        default: {
          throw new Error(`Unknown operation type: ${(operation as never)['type']}`)
        }
      }
    }

    return { ...old, rows }
  })
}
