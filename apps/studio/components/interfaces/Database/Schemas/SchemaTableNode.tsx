import { Handle, Node, NodeProps } from '@xyflow/react'
import { cn } from 'ui'

import { SchemaTableContent } from './SchemaTableContent'
import { TABLE_NODE_ROW_HEIGHT, TABLE_NODE_WIDTH } from './SchemaTable.constants'
import type { TableNodeData } from './Schemas.constants'

export { TABLE_NODE_WIDTH, TABLE_NODE_ROW_HEIGHT } from './SchemaTable.constants'

export const TableNode = ({
  id,
  data,
  targetPosition,
  sourcePosition,
  placeholder,
}: NodeProps<Node<TableNodeData>> & { placeholder?: boolean }) => {
  // Important styles is a nasty hack to use Handles (required for edges calculations), but do not show them in the UI.
  // ref: https://github.com/wbkd/react-flow/discussions/2698
  const hiddenNodeConnector = '!h-px !w-px !min-w-0 !min-h-0 !cursor-grab !border-0 !opacity-0'

  return (
    <SchemaTableContent
      graphNodeId={id}
      data={data}
      placeholder={placeholder}
      renderForeignTargetHandle={() =>
        targetPosition ? (
          <Handle
            type="target"
            id={data.name}
            position={targetPosition}
            className={cn(hiddenNodeConnector)}
          />
        ) : null
      }
      renderColumnTargetHandle={(columnId) =>
        targetPosition ? (
          <Handle
            type="target"
            id={columnId}
            position={targetPosition}
            className={cn(hiddenNodeConnector)}
          />
        ) : null
      }
      renderColumnSourceHandle={(columnId) =>
        sourcePosition ? (
          <Handle
            type="source"
            id={columnId}
            position={sourcePosition}
            className={cn(hiddenNodeConnector)}
          />
        ) : null
      }
    />
  )
}
