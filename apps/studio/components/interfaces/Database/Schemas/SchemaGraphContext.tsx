import { createContext, useContext, type ReactNode } from 'react'

import type { SchemaRelationSelection } from './Schemas.constants'

export type SchemaGraphContextType = {
  isDownloading: boolean
  selectedEdge: SchemaRelationSelection | undefined
  onEditColumn: (tableId: number, columnId: string) => void
  onEditTable: (tableId: number) => void
}

export const SchemaGraphContext = createContext<SchemaGraphContextType | null>(null)

export const SchemaGraphContextProvider = ({
  children,
  value,
}: {
  children: ReactNode
  value: SchemaGraphContextType
}) => <SchemaGraphContext.Provider value={value}>{children}</SchemaGraphContext.Provider>

export const useSchemaGraphContext = () => {
  const context = useContext(SchemaGraphContext)
  if (!context)
    throw new Error('useSchemaGraphContext must be used inside a <SchemaGraphContextProvider>')
  return context
}
