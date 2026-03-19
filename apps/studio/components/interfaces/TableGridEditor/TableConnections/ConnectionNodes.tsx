import {
  ArrowDownLeft,
  ArrowUpRight,
  Radio,
  Shield,
  Table2,
  Webhook,
  Zap,
} from 'lucide-react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { cn } from 'ui'

const NODE_WIDTH = 220

export type CenterTableNodeData = {
  name: string
  schema: string
}

export type ConnectionNodeData = {
  label: string
  description: string
  category: 'trigger' | 'hook' | 'policy' | 'fk-outgoing' | 'fk-incoming' | 'realtime'
}

const categoryConfig = {
  trigger: { icon: Zap, color: 'text-amber-500', borderColor: 'border-amber-500/30' },
  hook: { icon: Webhook, color: 'text-purple-500', borderColor: 'border-purple-500/30' },
  policy: { icon: Shield, color: 'text-blue-500', borderColor: 'border-blue-500/30' },
  'fk-outgoing': {
    icon: ArrowUpRight,
    color: 'text-green-500',
    borderColor: 'border-green-500/30',
  },
  'fk-incoming': {
    icon: ArrowDownLeft,
    color: 'text-teal-500',
    borderColor: 'border-teal-500/30',
  },
  realtime: { icon: Radio, color: 'text-brand', borderColor: 'border-brand/30' },
}

export const CenterTableNode = ({ data }: NodeProps<CenterTableNodeData>) => {
  return (
    <div
      style={{ width: NODE_WIDTH }}
      className="rounded-md border-2 border-brand bg-surface-100 shadow-md"
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-brand/10 border-b border-brand/20">
        <Table2 size={14} className="text-brand" />
        <span className="text-sm font-medium text-foreground truncate">{data.name}</span>
      </div>
      <div className="px-3 py-1.5">
        <span className="text-xs text-foreground-lighter">{data.schema}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
    </div>
  )
}

export const ConnectionNode = ({ data }: NodeProps<ConnectionNodeData>) => {
  const config = categoryConfig[data.category]
  const Icon = config.icon

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={cn('rounded-md border bg-surface-100 shadow-sm', config.borderColor)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={14} className={config.color} />
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

export const DIAGRAM_NODE_WIDTH = NODE_WIDTH
export const DIAGRAM_NODE_HEIGHT = 56
