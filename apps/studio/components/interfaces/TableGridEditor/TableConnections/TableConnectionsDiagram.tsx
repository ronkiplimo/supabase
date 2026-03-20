import { useTheme } from 'next-themes'
import { useEffect, useMemo } from 'react'
import ReactFlow, { Background, Edge, Node, ReactFlowProvider, useReactFlow } from 'reactflow'
import 'reactflow/dist/style.css'

import { Entity } from 'data/table-editor/table-editor-types'
import { applyDagreLayout } from './TableConnectionsDiagram.utils'
import { CenterTableNode, CenterTableNodeData } from './CenterTableNode'
import { ConnectionNode, ConnectionNodeData } from './ConnectionNode'
import { useTableConnectionsContext } from './TableConnectionsProvider'

interface TableConnectionsDiagramProps {
  table: Entity
}

const nodeTypes = {
  centerTable: CenterTableNode,
  connection: ConnectionNode,
}

export function TableConnectionsDiagram({ table }: TableConnectionsDiagramProps) {
  return (
    <ReactFlowProvider>
      <DiagramContent table={table} />
    </ReactFlowProvider>
  )
}

function DiagramContent({ table }: TableConnectionsDiagramProps) {
  const reactFlow = useReactFlow()
  const { resolvedTheme } = useTheme()
  const { categories, isLoading } = useTableConnectionsContext()

  const { nodes, edges } = useMemo(() => {
    const nodes: Node<CenterTableNodeData | ConnectionNodeData>[] = []
    const edges: Edge[] = []

    const centerId = 'center'
    nodes.push({
      id: centerId,
      type: 'centerTable',
      data: { name: table.name, schema: table.schema },
      position: { x: 0, y: 0 },
    })

    let nodeIndex = 0
    categories.forEach(({ definition, items }) => {
      const direction = definition.diagram.direction

      items.forEach((item) => {
        const nodeId = `${definition.categoryId}-${item.id}-${nodeIndex++}`
        nodes.push({
          id: nodeId,
          type: 'connection',
          data: {
            label: item.name,
            description: item.description,
            icon: definition.display.icon,
            color: definition.display.color,
            borderColor: definition.display.borderColor,
          },
          position: { x: 0, y: 0 },
        })
        if (direction === 'right') {
          edges.push({
            id: `e-${nodeId}`,
            source: centerId,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
          })
        } else {
          edges.push({
            id: `e-${nodeId}`,
            source: nodeId,
            target: centerId,
            type: 'smoothstep',
            animated: true,
          })
        }
      })
    })

    return applyDagreLayout(nodes, edges)
  }, [table, categories])

  useEffect(() => {
    if (!isLoading && nodes.length > 0) {
      reactFlow.setNodes(nodes)
      reactFlow.setEdges(edges)
      setTimeout(() => reactFlow.fitView({ padding: 0.3, maxZoom: 1 }), 50)
    }
  }, [nodes, edges, isLoading])

  const backgroundPatternColor =
    resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.4)'

  if (isLoading) {
    return null
  }

  if (nodes.length <= 1) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-foreground-lighter">
        No connections found for this table
      </div>
    )
  }

  return (
    <ReactFlow
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      zoomOnPinch={true}
      zoomOnScroll={true}
      nodesDraggable={true}
      nodesConnectable={false}
      zoomOnDoubleClick={false}
      edgesFocusable={false}
      edgesUpdatable={false}
      defaultNodes={[]}
      defaultEdges={[]}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: 'smoothstep',
        animated: true,
      }}
    >
      <Background color={backgroundPatternColor} />
    </ReactFlow>
  )
}
