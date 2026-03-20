import { Shield } from 'lucide-react'
import React from 'react'
import { useParams } from 'common'
import { useDatabasePoliciesQuery } from 'data/database-policies/database-policies-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { ConnectionDefinition, TableConnectionTarget } from '../types'

function useData(target: TableConnectionTarget) {
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const { data, isLoading } = useDatabasePoliciesQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const items = (data ?? [])
    .filter((p) => p.schema === target.schema && p.table === target.name)
    .map((policy) => ({
      id: String(policy.id),
      name: policy.name,
      description: `${policy.command} — ${policy.action}`,
      href: `/project/${ref}/auth/policies?search=${target.name}&schema=${target.schema}`,
      icon: React.createElement(Shield, { size: 14 }),
      badges: [policy.command, ...policy.roles],
    }))

  return { items, isLoading }
}

export const policiesDefinition: ConnectionDefinition = {
  categoryId: 'policy',
  display: {
    title: 'RLS Policies',
    icon: Shield,
    color: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  diagram: {
    direction: 'right',
  },
  useData,
}
