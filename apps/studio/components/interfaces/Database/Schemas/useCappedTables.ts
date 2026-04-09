import type { PostgresTable } from '@supabase/postgres-meta'
import { useEffect, useMemo, useState } from 'react'

import { TABLE_NODE_LIMIT } from './Schemas.constants'

export function useCappedTables(tables: PostgresTable[], selectedSchema: string) {
  const [showAllTables, setShowAllTables] = useState(false)

  useEffect(() => {
    setShowAllTables(false)
  }, [selectedSchema])

  const isCapped = !showAllTables && tables.length > TABLE_NODE_LIMIT

  const tablesToRender = useMemo(() => {
    if (!isCapped) return tables

    const tablesInRelationships = new Set<string>()
    for (const table of tables) {
      for (const rel of table.relationships) {
        if (rel.source_schema === selectedSchema) {
          tablesInRelationships.add(rel.source_table_name)
        }
        if (rel.target_table_schema === selectedSchema) {
          tablesInRelationships.add(rel.target_table_name)
        }
      }
    }

    const withRels: PostgresTable[] = []
    const withoutRels: PostgresTable[] = []
    for (const table of tables) {
      if (tablesInRelationships.has(table.name)) {
        withRels.push(table)
      } else {
        withoutRels.push(table)
      }
    }

    const remaining = TABLE_NODE_LIMIT - withRels.length
    if (remaining <= 0) return withRels.slice(0, TABLE_NODE_LIMIT)
    return [...withRels, ...withoutRels.slice(0, remaining)]
  }, [tables, isCapped, selectedSchema])

  return { tablesToRender, isCapped, setShowAllTables }
}
