import { useDatabaseHooksQuery } from 'data/database-triggers/database-triggers-query'
import { useDatabaseTriggersQuery } from 'data/database-triggers/database-triggers-query'
import { useDatabasePoliciesQuery } from 'data/database-policies/database-policies-query'
import { useForeignKeyConstraintsQuery } from 'data/database/foreign-key-constraints-query'
import { useDatabasePublicationsQuery } from 'data/database-publications/database-publications-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'

interface UseTableConnectionsArgs {
  schema: string
  name: string
  id: number
}

export function useTableConnections({ schema, name, id }: UseTableConnectionsArgs) {
  const { data: project } = useSelectedProjectQuery()
  const projectRef = project?.ref
  const connectionString = project?.connectionString

  const { data: triggersData, isLoading: isLoadingTriggers } = useDatabaseTriggersQuery({
    projectRef,
    connectionString,
  })

  const { data: hooksData, isLoading: isLoadingHooks } = useDatabaseHooksQuery({
    projectRef,
    connectionString,
  })

  const { data: policiesData, isLoading: isLoadingPolicies } = useDatabasePoliciesQuery({
    projectRef,
    connectionString,
  })

  const { data: foreignKeysData, isLoading: isLoadingFKs } = useForeignKeyConstraintsQuery({
    projectRef,
    connectionString,
    schema,
  })

  const { data: publicationsData, isLoading: isLoadingPublications } =
    useDatabasePublicationsQuery({
      projectRef,
      connectionString,
    })

  const triggers = (triggersData ?? []).filter(
    (t) =>
      t.schema === schema &&
      t.table === name &&
      t.function_schema !== 'supabase_functions'
  )

  const hooks = (hooksData ?? []).filter(
    (h) => h.schema === schema && h.table === name
  )

  const policies = (policiesData ?? []).filter(
    (p) => p.schema === schema && p.table === name
  )

  const outgoingForeignKeys = (foreignKeysData ?? []).filter(
    (fk) => fk.source_schema === schema && fk.source_table === name
  )

  const incomingForeignKeys = (foreignKeysData ?? []).filter(
    (fk) => fk.target_schema === schema && fk.target_table === name
  )

  const realtimePublication = (publicationsData ?? []).find(
    (pub) => pub.name === 'supabase_realtime'
  )
  const isRealtimeEnabled = (realtimePublication?.tables ?? []).some((t) => t.id === id)

  const isLoading =
    isLoadingTriggers ||
    isLoadingHooks ||
    isLoadingPolicies ||
    isLoadingFKs ||
    isLoadingPublications

  const counts = {
    triggers: triggers.length,
    hooks: hooks.length,
    policies: policies.length,
    outgoingForeignKeys: outgoingForeignKeys.length,
    incomingForeignKeys: incomingForeignKeys.length,
    realtime: isRealtimeEnabled ? 1 : 0,
  }

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0)

  return {
    triggers,
    hooks,
    policies,
    outgoingForeignKeys,
    incomingForeignKeys,
    isRealtimeEnabled,
    isLoading,
    counts,
    total,
  }
}
