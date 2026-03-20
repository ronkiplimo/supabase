import { ArrowDownLeft } from 'lucide-react'
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
    .filter((fk) => fk.target_schema === target.schema && fk.target_table === target.name)
    .map((fk) => ({
      id: String(fk.id),
      name: fk.constraint_name,
      description: `← ${fk.source_schema}.${fk.source_table}`,
      href: `/project/${ref}/editor/${fk.source_id}`,
      icon: React.createElement(ArrowDownLeft, { size: 14 }),
      badges: [`${fk.source_columns.join(', ')} → ${fk.target_columns.join(', ')}`],
    }))

  return { items, isLoading }
}

export const fkIncomingDefinition: ConnectionDefinition = {
  categoryId: 'fk-incoming',
  display: {
    title: 'Foreign Keys (incoming)',
    icon: ArrowDownLeft,
    color: 'text-teal-500',
    borderColor: 'border-teal-500/30',
  },
  diagram: {
    direction: 'left',
  },
  useData,
}
