import { createContext, useContext, useMemo } from 'react'
import { connectionDefinitions } from './definitions'
import { ResolvedConnection, ResolvedConnections, TableConnectionTarget } from './types'

const TableConnectionsContext = createContext<ResolvedConnections | null>(null)

interface TableConnectionsProviderProps {
  target: TableConnectionTarget
  children: React.ReactNode
}

export function TableConnectionsProvider({ target, children }: TableConnectionsProviderProps) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const results = connectionDefinitions.map((def) => def.useData(target))

  const value = useMemo(() => {
    const categories = new Map<string, ResolvedConnection>()
    let total = 0
    let isLoading = false

    connectionDefinitions.forEach((def, i) => {
      const result = results[i]
      categories.set(def.categoryId, {
        definition: def,
        items: result.items,
        isLoading: result.isLoading,
      })
      total += result.items.length
      if (result.isLoading) isLoading = true
    })

    return { categories, total, isLoading }
  }, [results])

  return (
    <TableConnectionsContext.Provider value={value}>
      {children}
    </TableConnectionsContext.Provider>
  )
}

export function useTableConnectionsContext(): ResolvedConnections {
  const context = useContext(TableConnectionsContext)
  if (!context) {
    throw new Error('useTableConnectionsContext must be used within a TableConnectionsProvider')
  }
  return context
}
