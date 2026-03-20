import { Edge, Node, Position } from 'reactflow'
import { describe, expect, it } from 'vitest'
import { applyDagreLayout } from './TableConnectionsDiagram.utils'

function makeNode(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} }
}

function makeEdge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target }
}

describe('applyDagreLayout', () => {
  it('returns the same nodes and edges references', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges = [makeEdge('a', 'b')]
    const result = applyDagreLayout(nodes, edges)

    expect(result.nodes).toBe(nodes)
    expect(result.edges).toBe(edges)
  })

  it('assigns positions to all nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    applyDagreLayout(nodes, edges)

    for (const node of nodes) {
      expect(node.position.x).toEqual(expect.any(Number))
      expect(node.position.y).toEqual(expect.any(Number))
      expect(Number.isNaN(node.position.x)).toBe(false)
      expect(Number.isNaN(node.position.y)).toBe(false)
    }
  })

  it('sets targetPosition to Left and sourcePosition to Right on all nodes', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges = [makeEdge('a', 'b')]
    applyDagreLayout(nodes, edges)

    for (const node of nodes) {
      expect(node.targetPosition).toBe(Position.Left)
      expect(node.sourcePosition).toBe(Position.Right)
    }
  })

  it('lays out nodes left-to-right (source node is left of target)', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges = [makeEdge('a', 'b')]
    applyDagreLayout(nodes, edges)

    const nodeA = nodes.find((n) => n.id === 'a')!
    const nodeB = nodes.find((n) => n.id === 'b')!
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x)
  })

  it('handles a single node with no edges', () => {
    const nodes = [makeNode('solo')]
    const edges: Edge[] = []
    applyDagreLayout(nodes, edges)

    expect(nodes[0].position.x).toEqual(expect.any(Number))
    expect(nodes[0].position.y).toEqual(expect.any(Number))
    expect(nodes[0].targetPosition).toBe(Position.Left)
    expect(nodes[0].sourcePosition).toBe(Position.Right)
  })

  it('centers node positions by subtracting half the node dimensions', () => {
    const nodes = [makeNode('a')]
    const edges: Edge[] = []
    applyDagreLayout(nodes, edges)

    // Dagre places a single node at the center of its allocated space.
    // The position should be offset by half the node width/height.
    // For a single node the dagre center is at (width/2, height/2),
    // so after subtracting half we expect (0, 0).
    expect(nodes[0].position.x).toBe(0)
    expect(nodes[0].position.y).toBe(0)
  })

  it('spaces nodes apart for a branching graph', () => {
    const nodes = [makeNode('center'), makeNode('left'), makeNode('right')]
    const edges = [makeEdge('left', 'center'), makeEdge('center', 'right')]
    applyDagreLayout(nodes, edges)

    const positions = new Set(nodes.map((n) => `${n.position.x},${n.position.y}`))
    // All three nodes should have unique positions
    expect(positions.size).toBe(3)
  })
})
