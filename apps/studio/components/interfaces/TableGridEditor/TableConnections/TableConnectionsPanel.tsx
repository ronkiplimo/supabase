import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Radio,
  Shield,
  Webhook,
  Zap,
} from 'lucide-react'
import { useParams } from 'common'
import { SidePanel } from 'ui'
import { Entity } from 'data/table-editor/table-editor-types'
import { useTableConnections } from './useTableConnections'
import { ConnectionSection } from './ConnectionSection'
import { ConnectionItem } from './ConnectionItem'
import { TableConnectionsDiagram } from './TableConnectionsDiagram'

interface TableConnectionsPanelProps {
  visible: boolean
  onClose: () => void
  table: Entity
}

export function TableConnectionsPanel({ visible, onClose, table }: TableConnectionsPanelProps) {
  const { ref } = useParams()

  const {
    triggers,
    hooks,
    policies,
    outgoingForeignKeys,
    incomingForeignKeys,
    isRealtimeEnabled,
    isLoading,
    counts,
    total,
  } = useTableConnections({ schema: table.schema, name: table.name, id: table.id })

  return (
    <SidePanel
      hideFooter
      size="large"
      header={
        <div className="flex items-center gap-2">
          <span>Connections for {table.name}</span>
          <span className="flex items-center justify-center rounded-full bg-surface-300 px-1.5 min-w-[20px] h-5 text-xs text-foreground-light font-mono">
            {total}
          </span>
        </div>
      }
      visible={visible}
      onCancel={onClose}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-foreground-muted" />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="h-[300px] border-b">
            <TableConnectionsDiagram table={table} />
          </div>

          <div className="py-2 overflow-auto">
            <ConnectionSection
              title="Foreign Keys (outgoing)"
              icon={<ArrowUpRight size={14} className="text-foreground-muted" />}
              count={counts.outgoingForeignKeys}
            >
              {outgoingForeignKeys.map((fk) => (
                <ConnectionItem
                  key={fk.id}
                  name={fk.constraint_name}
                  description={`→ ${fk.target_schema}.${fk.target_table}`}
                  href={`/project/${ref}/editor/${fk.target_id}`}
                  icon={<ArrowUpRight size={14} />}
                  badges={[
                    `${fk.source_columns.join(', ')} → ${fk.target_columns.join(', ')}`,
                  ]}
                />
              ))}
            </ConnectionSection>

            <ConnectionSection
              title="Foreign Keys (incoming)"
              icon={<ArrowDownLeft size={14} className="text-foreground-muted" />}
              count={counts.incomingForeignKeys}
            >
              {incomingForeignKeys.map((fk) => (
                <ConnectionItem
                  key={fk.id}
                  name={fk.constraint_name}
                  description={`← ${fk.source_schema}.${fk.source_table}`}
                  href={`/project/${ref}/editor/${fk.source_id}`}
                  icon={<ArrowDownLeft size={14} />}
                  badges={[
                    `${fk.source_columns.join(', ')} → ${fk.target_columns.join(', ')}`,
                  ]}
                />
              ))}
            </ConnectionSection>

            <ConnectionSection
              title="Triggers"
              icon={<Zap size={14} className="text-foreground-muted" />}
              count={counts.triggers}
            >
              {triggers.map((trigger) => (
                <ConnectionItem
                  key={trigger.id}
                  name={trigger.name}
                  description={`${trigger.activation} ${trigger.events.join('/')} → ${trigger.function_name}`}
                  href={`/project/${ref}/database/triggers`}
                  icon={<Zap size={14} />}
                  badges={[trigger.activation, ...trigger.events]}
                />
              ))}
            </ConnectionSection>

            <ConnectionSection
              title="Database Hooks"
              icon={<Webhook size={14} className="text-foreground-muted" />}
              count={counts.hooks}
            >
              {hooks.map((hook) => (
                <ConnectionItem
                  key={hook.id}
                  name={hook.name}
                  description={`${hook.events.join('/')} → ${hook.function_name}`}
                  href={`/project/${ref}/database/hooks`}
                  icon={<Webhook size={14} />}
                  badges={hook.events}
                />
              ))}
            </ConnectionSection>

            <ConnectionSection
              title="RLS Policies"
              icon={<Shield size={14} className="text-foreground-muted" />}
              count={counts.policies}
            >
              {policies.map((policy) => (
                <ConnectionItem
                  key={policy.id}
                  name={policy.name}
                  description={`${policy.command} — ${policy.action}`}
                  href={`/project/${ref}/auth/policies?search=${table.name}&schema=${table.schema}`}
                  icon={<Shield size={14} />}
                  badges={[policy.command, ...policy.roles]}
                />
              ))}
            </ConnectionSection>

            <ConnectionSection
              title="Realtime"
              icon={<Radio size={14} className="text-foreground-muted" />}
              count={counts.realtime}
            >
              {isRealtimeEnabled && (
                <ConnectionItem
                  name="supabase_realtime"
                  description="Table is published to realtime"
                  href={`/project/${ref}/database/publications`}
                  icon={<Radio size={14} />}
                  badges={['Enabled']}
                />
              )}
            </ConnectionSection>
          </div>
        </div>
      )}
    </SidePanel>
  )
}
