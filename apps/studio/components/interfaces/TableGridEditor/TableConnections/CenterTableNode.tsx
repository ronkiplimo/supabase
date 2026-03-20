import { Table2 } from 'lucide-react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { DIAGRAM_NODE_WIDTH } from './TableConnectionsDiagram.constants'

export type CenterTableNodeData = {
  name: string
  schema: string
}

export const CenterTableNode = ({ data }: NodeProps<CenterTableNodeData>) => {
  return (
    <div
      style={{ width: DIAGRAM_NODE_WIDTH }}
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
