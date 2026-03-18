export type TableNodeColumnData = {
  id: string
  isPrimary: boolean
  isNullable: boolean
  isUnique: boolean
  isIdentity: boolean
  name: string
  format: string
}

export type TableNodeData = {
  id: number
  schema: string
  name: string
  ref?: string
  isForeign: boolean
  description: string
  columns: TableNodeColumnData[]
}
