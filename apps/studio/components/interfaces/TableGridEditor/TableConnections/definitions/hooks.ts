import { Webhook } from 'lucide-react'
import React from 'react'
import { useParams } from 'common'
import { useDatabaseHooksQuery } from 'data/database-triggers/database-triggers-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { ConnectionDefinition, TableConnectionTarget } from '../types'

function useData(target: TableConnectionTarget) {
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const { data, isLoading } = useDatabaseHooksQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const items = (data ?? [])
    .filter((h) => h.schema === target.schema && h.table === target.name)
    .map((hook) => ({
      id: String(hook.id),
      name: hook.name,
      description: `${hook.events.join('/')} → ${hook.function_name}`,
      href: `/project/${ref}/database/hooks`,
      icon: React.createElement(Webhook, { size: 14 }),
      badges: hook.events,
    }))

  return { items, isLoading }
}

export const hooksDefinition: ConnectionDefinition = {
  categoryId: 'hook',
  display: {
    title: 'Database Hooks',
    icon: Webhook,
    color: 'text-purple-500',
    borderColor: 'border-purple-500/30',
  },
  diagram: {
    direction: 'right',
  },
  useData,
}
