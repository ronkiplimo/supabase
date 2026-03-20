import { Zap } from 'lucide-react'
import React from 'react'
import { useParams } from 'common'
import { useDatabaseTriggersQuery } from 'data/database-triggers/database-triggers-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { ConnectionDefinition, TableConnectionTarget } from '../types'

function useData(target: TableConnectionTarget) {
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const { data, isLoading } = useDatabaseTriggersQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const items = (data ?? [])
    .filter(
      (t) =>
        t.schema === target.schema &&
        t.table === target.name &&
        t.function_schema !== 'supabase_functions'
    )
    .map((trigger) => ({
      id: String(trigger.id),
      name: trigger.name,
      description: `${trigger.activation} ${trigger.events.join('/')} → ${trigger.function_name}`,
      href: `/project/${ref}/database/triggers`,
      icon: React.createElement(Zap, { size: 14 }),
      badges: [trigger.activation, ...trigger.events],
    }))

  return { items, isLoading }
}

export const triggersDefinition: ConnectionDefinition = {
  categoryId: 'trigger',
  display: {
    title: 'Triggers',
    icon: Zap,
    color: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
  diagram: {
    direction: 'right',
  },
  useData,
}
