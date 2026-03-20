import { Loader2 } from 'lucide-react'
import React from 'react'
import { SidePanel } from 'ui'
import { Entity } from 'data/table-editor/table-editor-types'
import { TableConnectionsProvider, useTableConnectionsContext } from './TableConnectionsProvider'
import { ConnectionList } from './ConnectionList'
import { TableConnectionsDiagram } from './TableConnectionsDiagram'

interface TableConnectionsPanelProps {
  visible: boolean
  onClose: () => void
  table: Entity
}

export function TableConnectionsPanel({ visible, onClose, table }: TableConnectionsPanelProps) {
  return (
    <TableConnectionsProvider target={{ schema: table.schema, name: table.name, id: table.id }}>
      <TableConnectionsPanelContent visible={visible} onClose={onClose} table={table} />
    </TableConnectionsProvider>
  )
}

function TableConnectionsPanelContent({ visible, onClose, table }: TableConnectionsPanelProps) {
  const { categories, total, isLoading } = useTableConnectionsContext()

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

          <ConnectionList>
            {Array.from(categories.values()).map((resolved) => {
              const { definition, items } = resolved
              const Icon = definition.display.icon
              return (
                <ConnectionList.Section
                  key={definition.categoryId}
                  title={definition.display.title}
                  icon={<Icon size={14} className="text-foreground-muted" />}
                  count={items.length}
                >
                  {items.map((item) => (
                    <ConnectionList.Item key={item.id} item={item} />
                  ))}
                </ConnectionList.Section>
              )
            })}
          </ConnectionList>
        </div>
      )}
    </SidePanel>
  )
}
