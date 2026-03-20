import dagre from '@dagrejs/dagre'
import { Edge, Node, Position } from 'reactflow'
import { DIAGRAM_NODE_HEIGHT, DIAGRAM_NODE_WIDTH } from './diagramConstants'

export function applyDagreLayout(nodes: Node[], edges: Edge[]) {
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
