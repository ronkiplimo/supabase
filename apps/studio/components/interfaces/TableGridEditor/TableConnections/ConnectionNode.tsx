import { LucideIcon } from 'lucide-react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { cn } from 'ui'
import { DIAGRAM_NODE_WIDTH } from './TableConnectionsDiagram.constants'

export type ConnectionNodeData = {
  label: string
  description: string
  icon: LucideIcon
  color: string
  borderColor: string
}

export const ConnectionNode = ({ data }: NodeProps<ConnectionNodeData>) => {
  const Icon = data.icon

  return (
    <div
      style={{ width: DIAGRAM_NODE_WIDTH }}
      className={cn('rounded-md border bg-surface-100 shadow-sm', data.borderColor)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={14} className={data.color} />
        <span className="text-xs font-medium text-foreground truncate">{data.label}</span>
      </div>
      {data.description && (
        <div className="px-3 pb-2 -mt-0.5">
          <span className="text-[11px] text-foreground-lighter truncate block">
            {data.description}
          </span>
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  )
}
