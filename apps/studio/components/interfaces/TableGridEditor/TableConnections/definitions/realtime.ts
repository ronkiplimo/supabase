import { Radio } from 'lucide-react'
import React from 'react'
import { useParams } from 'common'
import { useDatabasePublicationsQuery } from 'data/database-publications/database-publications-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { ConnectionDefinition, TableConnectionTarget } from '../types'

function useData(target: TableConnectionTarget) {
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const { data, isLoading } = useDatabasePublicationsQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const realtimePublication = (data ?? []).find((pub) => pub.name === 'supabase_realtime')
  const isEnabled = (realtimePublication?.tables ?? []).some((t) => t.id === target.id)

  const items = isEnabled
    ? [
        {
          id: 'realtime',
          name: 'supabase_realtime',
          description: 'Table is published to realtime',
          href: `/project/${ref}/database/publications`,
          icon: React.createElement(Radio, { size: 14 }),
          badges: ['Enabled'],
        },
      ]
    : []

  return { items, isLoading }
}

export const realtimeDefinition: ConnectionDefinition = {
  categoryId: 'realtime',
  display: {
    title: 'Realtime',
    icon: Radio,
    color: 'text-brand',
    borderColor: 'border-brand/30',
  },
  diagram: {
    direction: 'right',
  },
  useData,
}
