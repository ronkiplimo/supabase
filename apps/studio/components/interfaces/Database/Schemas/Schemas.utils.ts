import dagre from '@dagrejs/dagre'
import type { PostgresSchema, PostgresTable } from '@supabase/postgres-meta'
import { Edge, Node, Position } from '@xyflow/react'
import { uniqBy } from 'lodash'

import '@xyflow/react/dist/style.css'

import { LOCAL_STORAGE_KEYS } from 'common'

import { TABLE_NODE_ROW_HEIGHT, TABLE_NODE_WIDTH } from './SchemaTable.constants'
import { TableNodeData } from './Schemas.constants'
import { tryParseJson } from '@/lib/helpers'

const NODE_SEP = 25
const RANK_SEP = 50
const DEFAULT_STRESS_TABLE_COUNT = 100
const DEFAULT_STRESS_COLUMN_COUNT = 10

export const SCHEMA_GRAPH_MOCK_PRESETS = ['100x10'] as const

export type SchemaGraphMockPreset = (typeof SCHEMA_GRAPH_MOCK_PRESETS)[number]

export const isSchemaGraphMockPreset = (
  value: string | string[] | undefined
): value is SchemaGraphMockPreset => value === '100x10'

export const createMockSchemaGraphData = ({
  schemaName,
  tableCount = DEFAULT_STRESS_TABLE_COUNT,
  columnCount = DEFAULT_STRESS_COLUMN_COUNT,
}: {
  schemaName: string
  tableCount?: number
  columnCount?: number
}) => {
  const normalizedSchemaName = schemaName || 'public'

  const tables = Array.from({ length: tableCount }, (_, tableIndex) => {
    const id = tableIndex + 1
    const tableName = `mock_table_${String(id).padStart(3, '0')}`
    const columns = Array.from({ length: columnCount }, (_, columnIndex) => {
      const ordinal = columnIndex + 1
      const columnName = ordinal === 1 ? 'id' : `column_${String(ordinal).padStart(2, '0')}`
      const isPrimary = ordinal === 1

      return {
        table_id: id,
        schema: normalizedSchemaName,
        table: tableName,
        id: `${tableName}.${columnName}`,
        ordinal_position: ordinal,
        name: columnName,
        default_value: isPrimary ? `generated:${tableName}` : null,
        data_type: isPrimary ? 'int8' : 'text',
        format: isPrimary ? 'int8' : 'text',
        is_identity: isPrimary,
        identity_generation: isPrimary ? ('BY DEFAULT' as const) : null,
        is_generated: false,
        is_nullable: !isPrimary,
        is_updatable: true,
        is_unique: isPrimary,
        enums: [],
        check: null,
        comment: ordinal === 2 ? `Synthetic column ${ordinal} for ${tableName}` : null,
      }
    })

    return {
      id,
      schema: normalizedSchemaName,
      name: tableName,
      rls_enabled: false,
      rls_forced: false,
      replica_identity: 'DEFAULT' as const,
      bytes: 0,
      size: '0 bytes',
      live_rows_estimate: 0,
      dead_rows_estimate: 0,
      comment: `Synthetic stress table ${id}`,
      columns,
      primary_keys: [{ schema: normalizedSchemaName, table_name: tableName, name: 'id', table_id: id }],
      relationships: [] as PostgresTable['relationships'],
    } satisfies PostgresTable
  })

  let relationshipId = 1

  for (let tableIndex = 1; tableIndex < tables.length; tableIndex += 1) {
    const sourceTable = tables[tableIndex]
    const previousTable = tables[tableIndex - 1]
    const previousPreviousTable = tables[tableIndex - 2]

    sourceTable.relationships.push({
      id: relationshipId,
      constraint_name: `${sourceTable.name}_parent_fkey`,
      source_schema: normalizedSchemaName,
      source_table_name: sourceTable.name,
      source_column_name: 'column_02',
      target_table_schema: normalizedSchemaName,
      target_table_name: previousTable.name,
      target_column_name: 'id',
    })
    relationshipId += 1

    if (previousPreviousTable) {
      sourceTable.relationships.push({
        id: relationshipId,
        constraint_name: `${sourceTable.name}_secondary_parent_fkey`,
        source_schema: normalizedSchemaName,
        source_table_name: sourceTable.name,
        source_column_name: 'column_03',
        target_table_schema: normalizedSchemaName,
        target_table_name: previousPreviousTable.name,
        target_column_name: 'id',
      })
      relationshipId += 1
    }
  }

  return {
    schemas: [{ id: -100, name: normalizedSchemaName, owner: 'postgres' } satisfies PostgresSchema],
    tables,
  }
}

export async function getGraphDataFromTables(
  ref?: string,
  schema?: PostgresSchema,
  tables?: PostgresTable[]
): Promise<{
  nodes: Node<TableNodeData>[]
  edges: Edge[]
}> {
  if (!tables?.length) {
    return { nodes: [], edges: [] }
  }

  const nodes = tables.map((table) => {
    const columns = (table.columns || []).map((column) => {
      return {
        id: column.id,
        isPrimary: table.primary_keys.some((pk) => pk.name === column.name),
        name: column.name,
        format: column.format,
        isNullable: column.is_nullable,
        isUnique: column.is_unique,
        isUpdateable: column.is_updatable,
        isIdentity: column.is_identity,
      }
    })

    const data: TableNodeData = {
      ref,
      id: table.id,
      name: table.name,
      description: table.comment ?? '',
      schema: table.schema,
      isForeign: false,
      columns,
    }

    return {
      data,
      id: `${table.id}`,
      type: 'table',
      position: { x: 0, y: 0 },
    }
  })

  const edges: Edge[] = []
  const currentSchema = tables[0].schema
  const uniqueRelationships = uniqBy(
    tables.flatMap((t) => t.relationships),
    'id'
  )

  for (const rel of uniqueRelationships) {
    // TODO: Support [external->this] relationship?
    if (rel.source_schema !== currentSchema) {
      continue
    }

    // Create additional [this->foreign] node that we can point to on the graph.
    if (rel.target_table_schema !== currentSchema) {
      const targetId = `${rel.target_table_schema}.${rel.target_table_name}.${rel.target_column_name}`

      const targetNode = nodes.find((n) => n.id === targetId)
      if (!targetNode) {
        const data: TableNodeData = {
          id: rel.id,
          ref: ref!,
          schema: rel.target_table_schema,
          name: targetId,
          description: '',
          isForeign: true,
          columns: [],
        }

        nodes.push({
          id: targetId,
          type: 'table',
          data: data,
          position: { x: 0, y: 0 },
        })
      }

      const [source, sourceHandle] = findTablesHandleIds(
        tables,
        rel.source_table_name,
        rel.source_column_name
      )

      if (source) {
        edges.push({
          id: String(rel.id),
          source,
          sourceHandle,
          target: targetId,
          targetHandle: targetId,
          deletable: false,
          data: {
            sourceName: rel.source_table_name,
            sourceSchemaName: rel.source_schema,
            sourceColumnName: rel.source_column_name,
            targetName: rel.target_table_name,
            targetSchemaName: rel.target_table_schema,
            targetColumnName: rel.target_column_name,
          },
        })
      }

      continue
    }

    const [source, sourceHandle] = findTablesHandleIds(
      tables,
      rel.source_table_name,
      rel.source_column_name
    )
    const [target, targetHandle] = findTablesHandleIds(
      tables,
      rel.target_table_name,
      rel.target_column_name
    )

    // We do not support [external->this] flow currently.
    if (source && target) {
      edges.push({
        id: String(rel.id),
        source,
        sourceHandle,
        target,
        targetHandle,
        type: 'default',
        data: {
          sourceName: rel.source_table_name,
          sourceSchemaName: rel.source_schema,
          sourceColumnName: rel.source_column_name,
          targetName: rel.target_table_name,
          targetSchemaName: rel.target_table_schema,
          targetColumnName: rel.target_column_name,
        },
      })
    }
  }

  const savedPositionsLocalStorage = localStorage.getItem(
    LOCAL_STORAGE_KEYS.SCHEMA_VISUALIZER_POSITIONS(ref ?? 'project', schema?.id ?? 0)
  )
  const savedPositions = tryParseJson(savedPositionsLocalStorage)
  return !!savedPositions
    ? getLayoutedElementsViaLocalStorage(nodes, edges, savedPositions)
    : getLayoutedElementsViaDagre(nodes, edges)
}

function findTablesHandleIds(
  tables: PostgresTable[],
  table_name: string,
  column_name: string
): [string?, string?] {
  for (const table of tables) {
    if (table_name !== table.name) continue

    for (const column of table.columns || []) {
      if (column_name !== column.name) continue

      return [String(table.id), column.id]
    }
  }

  return []
}

export const getLayoutedElementsViaDagre = (nodes: Node<TableNodeData>[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: 'LR',
    align: 'UR',
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
  })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: TABLE_NODE_WIDTH / 2,
      height: (TABLE_NODE_ROW_HEIGHT / 2) * (node.data.columns.length + 1), // columns + header
    })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.targetPosition = Position.Left
    node.sourcePosition = Position.Right
    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    }

    return node
  })

  return { nodes, edges }
}

const getLayoutedElementsViaLocalStorage = (
  nodes: Node<TableNodeData>[],
  edges: Edge[],
  positions: { [key: string]: { x: number; y: number } }
) => {
  // [Joshen] Potentially look into auto fitting new nodes?
  // https://github.com/xyflow/xyflow/issues/1113

  const nodesWithNoSavedPositons = nodes.filter((n) => !(n.id in positions))
  let newNodeCount = 0
  let basePosition = {
    x: 0,
    y: -(NODE_SEP + TABLE_NODE_ROW_HEIGHT + nodesWithNoSavedPositons.length * 10),
  }

  nodes.forEach((node) => {
    const existingPosition = positions?.[node.id]

    node.targetPosition = Position.Left
    node.sourcePosition = Position.Right

    if (existingPosition) {
      node.position = existingPosition
    } else {
      node.position = {
        x: basePosition.x + newNodeCount * 10,
        y: basePosition.y + newNodeCount * 10,
      }
      newNodeCount += 1
    }
  })
  return { nodes, edges }
}
