import { ArrowUpRight } from 'lucide-react'
import React from 'react'
import { useParams } from 'common'
import { useForeignKeyConstraintsQuery } from 'data/database/foreign-key-constraints-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { ConnectionDefinition, TableConnectionTarget } from '../types'

function useData(target: TableConnectionTarget) {
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const { data, isLoading } = useForeignKeyConstraintsQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
    schema: target.schema,
  })

  const items = (data ?? [])
    .filter((fk) => fk.source_schema === target.schema && fk.source_table === target.name)
    .map((fk) => ({
      id: String(fk.id),
      name: fk.constraint_name,
      description: `→ ${fk.target_schema}.${fk.target_table}`,
      href: `/project/${ref}/editor/${fk.target_id}`,
      icon: React.createElement(ArrowUpRight, { size: 14 }),
      badges: [`${fk.source_columns.join(', ')} → ${fk.target_columns.join(', ')}`],
    }))

  return { items, isLoading }
}

export const fkOutgoingDefinition: ConnectionDefinition = {
  categoryId: 'fk-outgoing',
  display: {
    title: 'Foreign Keys (outgoing)',
    icon: ArrowUpRight,
    color: 'text-green-500',
    borderColor: 'border-green-500/30',
  },
  diagram: {
    direction: 'right',
  },
  useData,
}
