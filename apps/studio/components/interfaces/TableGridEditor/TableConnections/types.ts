import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

export interface TableConnectionTarget {
  schema: string
  name: string
  id: number
}

export interface ConnectionItem {
  id: string
  name: string
  description: string
  href: string
  icon: ReactNode
  badges: string[]
}

export interface ConnectionDataResult {
  items: ConnectionItem[]
  isLoading: boolean
}

export interface ConnectionDefinition {
  categoryId: string
  display: {
    title: string
    icon: LucideIcon
    color: string
    borderColor: string
  }
  diagram: {
    direction: 'left' | 'right'
  }
  useData: (target: TableConnectionTarget) => ConnectionDataResult
}

export interface ResolvedConnection {
  definition: ConnectionDefinition
  items: ConnectionItem[]
  isLoading: boolean
}

export interface ResolvedConnections {
  categories: Map<string, ResolvedConnection>
  total: number
  isLoading: boolean
}
