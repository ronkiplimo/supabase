import dagre from '@dagrejs/dagre'
import { useTheme } from 'next-themes'
import { useEffect, useMemo } from 'react'
import ReactFlow, { Background, Edge, Node, Position, ReactFlowProvider, useReactFlow } from 'reactflow'
import 'reactflow/dist/style.css'

import { Entity } from 'data/table-editor/table-editor-types'
import { useTableConnections } from './useTableConnections'
import {
  CenterTableNode,
  CenterTableNodeData,
  ConnectionNode,
  ConnectionNodeData,
  DIAGRAM_NODE_HEIGHT,
  DIAGRAM_NODE_WIDTH,
} from './ConnectionNodes'

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

  const {
    triggers,
    hooks,
    policies,
    outgoingForeignKeys,
    incomingForeignKeys,
    isRealtimeEnabled,
    isLoading,
  } = useTableConnections({ schema: table.schema, name: table.name, id: table.id })

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
    const addConnection = (
      id: string,
      label: string,
      description: string,
      category: ConnectionNodeData['category'],
      direction: 'left' | 'right'
    ) => {
      const nodeId = `${category}-${id}-${nodeIndex++}`
      nodes.push({
        id: nodeId,
        type: 'connection',
        data: { label, description, category },
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
    }

    // Incoming FKs on the left
    incomingForeignKeys.forEach((fk) => {
      addConnection(
        String(fk.id),
        fk.constraint_name,
        `${fk.source_schema}.${fk.source_table}`,
        'fk-incoming',
        'left'
      )
    })

    // Outgoing FKs on the right
    outgoingForeignKeys.forEach((fk) => {
      addConnection(
        String(fk.id),
        fk.constraint_name,
        `→ ${fk.target_schema}.${fk.target_table}`,
        'fk-outgoing',
        'right'
      )
    })

    // Triggers on the right
    triggers.forEach((t) => {
      addConnection(
        String(t.id),
        t.name,
        `${t.activation} ${t.events.join('/')}`,
        'trigger',
        'right'
      )
    })

    // Hooks on the right
    hooks.forEach((h) => {
      addConnection(String(h.id), h.name, h.events.join('/'), 'hook', 'right')
    })

    // Policies on the right
    policies.forEach((p) => {
      addConnection(String(p.id), p.name, `${p.command} — ${p.action}`, 'policy', 'right')
    })

    // Realtime on the right
    if (isRealtimeEnabled) {
      addConnection('realtime', 'supabase_realtime', 'Published', 'realtime', 'right')
    }

    return applyDagreLayout(nodes, edges)
  }, [
    table,
    triggers,
    hooks,
    policies,
    outgoingForeignKeys,
    incomingForeignKeys,
    isRealtimeEnabled,
  ])

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

function applyDagreLayout(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 30,
    ranksep: 80,
  })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: DIAGRAM_NODE_WIDTH,
      height: DIAGRAM_NODE_HEIGHT,
    })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const pos = dagreGraph.node(node.id)
    node.targetPosition = Position.Left
    node.sourcePosition = Position.Right
    node.position = {
      x: pos.x - DIAGRAM_NODE_WIDTH / 2,
      y: pos.y - DIAGRAM_NODE_HEIGHT / 2,
    }
  })

  return { nodes, edges }
}
