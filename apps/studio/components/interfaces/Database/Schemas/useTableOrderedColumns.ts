import { LOCAL_STORAGE_KEYS } from 'common'
import { useLocalStorage } from 'hooks/misc/useLocalStorage'
import { useMemo } from 'react'
import { useReactFlow, useUpdateNodeInternals } from 'reactflow'

import { TableNodeColumnData, TableNodeData } from './SchemaTableNode.types'

type SetColumnsFunction = (columns: Array<TableNodeColumnData>) => void

export const useTableOrderedColumns = ({
  nodeId,
  projectRef,
  table,
}: {
  nodeId: string
  projectRef: string | undefined
  table: TableNodeData
}): [Array<TableNodeColumnData>, SetColumnsFunction] => {
  const updateNodeInternals = useUpdateNodeInternals()
  const [columns, setColumns] = useLocalStorage<string[] | undefined>(
    LOCAL_STORAGE_KEYS.SCHEMA_VISUALIZER_TABLE_COLUMNS(projectRef as string, table.id),
    undefined
  )

  return useMemo(() => {
    const persistColumns = (columns: Array<TableNodeColumnData>) => {
      setColumns(columns.map((column) => column.id))
      // Ask reactflow to update the node handles (links between nodes)
      updateNodeInternals(nodeId)
    }

    if (!columns) {
      return [table.columns, persistColumns]
    }

    const columnsById: Record<string, TableNodeColumnData> = {}
    table.columns.forEach((column) => {
      columnsById[column.id] = column
    })

    // The original table may have been modified (columns added or removed)
    // Make sure to remove columns that don't exist anymore from the persisted ones
    const cleanColumns = columns.filter((columnId) =>
      table.columns.some((column) => column.id === columnId)
    )

    // Make sure we add the new columns at the end of the persisted ones if needed
    const missingColumns = table.columns.filter((column) => !cleanColumns.includes(column.id))
    const orderedColumn = cleanColumns
      .map((columnId) => columnsById[columnId])
      .concat(missingColumns)

    return [orderedColumn, persistColumns]
  }, [columns, table.columns, setColumns])
}
