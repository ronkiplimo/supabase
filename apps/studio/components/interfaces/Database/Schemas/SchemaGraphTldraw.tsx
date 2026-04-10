import type { PostgresSchema, PostgresTable } from '@supabase/postgres-meta'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import type { Edge, Node } from '@xyflow/react'
import {
  ArrowShapeUtil,
  BaseBoxShapeUtil,
  HTMLContainer,
  Mat,
  T,
  Tldraw,
  createShapeId,
  getArrowInfo,
  useEditor,
  useValue,
} from 'tldraw'
import { toPng, toSvg } from 'html-to-image'
import { ArrowLeft, ArrowRight, Check, Copy, Download, Loader2, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { LOCAL_STORAGE_KEYS, useParams } from 'common'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  copyToClipboard,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from 'ui'
import { Admonition } from 'ui-patterns/admonition'

import { SidePanelEditor } from '../../TableGridEditor/SidePanelEditor/SidePanelEditor'
import { SchemaGraphContextProvider, type SchemaGraphContextType } from './SchemaGraphContext'
import { SchemaGraphLegend } from './SchemaGraphLegend'
import { SchemaTableContent } from './SchemaTableContent'
import {
  type EdgeData,
  type SchemaRelationSelection,
  type TableNodeData,
} from './Schemas.constants'
import {
  TABLE_NODE_VISUAL_ROW_HEIGHT,
  TABLE_NODE_VISUAL_WIDTH,
} from './SchemaTable.constants'
import {
  createMockSchemaGraphData,
  getGraphDataFromTables,
  type SchemaGraphMockPreset,
} from './Schemas.utils'
import AlertError from '@/components/ui/AlertError'
import { ButtonTooltip } from '@/components/ui/ButtonTooltip'
import SchemaSelector from '@/components/ui/SchemaSelector'
import { useSchemasQuery } from '@/data/database/schemas-query'
import { useTablesQuery } from '@/data/tables/tables-query'
import { useAsyncCheckPermissions } from '@/hooks/misc/useCheckPermissions'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'
import { useQuerySchemaState } from '@/hooks/misc/useSchemaQueryState'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { useIsProtectedSchema } from '@/hooks/useProtectedSchemas'
import { useStaticEffectEvent } from '@/hooks/useStaticEffectEvent'
import { tablesToSQL } from '@/lib/helpers'
import { useTableEditorStateSnapshot } from '@/state/table-editor'

const SCHEMA_TABLE_SHAPE_TYPE = 'schema-table'
const SCHEMA_RELATION_META_KEY = 'schemaRelation'
const ZOOM_STEPS = [0.2, 0.3, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8]

type TldrawEditor = import('tldraw').Editor
type TldrawArrowShape = import('tldraw').TLArrowShape
type TldrawShape = import('tldraw').TLShape
type VecLike = { x: number; y: number }
type SchemaTableShape = {
  id: ReturnType<typeof getTableShapeId>
  type: typeof SCHEMA_TABLE_SHAPE_TYPE
  x: number
  y: number
  props: {
    w: number
    h: number
    nodeId: string
    tableData: TableNodeData
  }
}

const schemaTableColumnValidator = T.object({
  id: T.string,
  isPrimary: T.boolean,
  isNullable: T.boolean,
  isUnique: T.boolean,
  isUpdateable: T.boolean,
  isIdentity: T.boolean,
  name: T.string,
  format: T.string,
})

const schemaTableDataValidator = T.object({
  id: T.number,
  schema: T.string,
  name: T.string,
  ref: T.string.optional(),
  isForeign: T.boolean,
  description: T.string,
  columns: T.arrayOf(schemaTableColumnValidator),
})

const EMPTY_TABLE_NODE_DATA: TableNodeData = {
  id: 0,
  schema: '',
  name: '',
  ref: undefined,
  isForeign: false,
  description: '',
  columns: [],
}

class SchemaTableShapeUtil extends BaseBoxShapeUtil<any> {
  static override type = SCHEMA_TABLE_SHAPE_TYPE
  static override props = {
    w: T.number,
    h: T.number,
    nodeId: T.string,
    tableData: schemaTableDataValidator,
  }

  override canResize() {
    return false
  }

  override canEdit() {
    return false
  }

  override canBind() {
    return true
  }

  override hideResizeHandles() {
    return true
  }

  override hideRotateHandle() {
    return true
  }

  override hideSelectionBoundsBg() {
    return true
  }

  override hideSelectionBoundsFg() {
    return true
  }

  override getDefaultProps(): SchemaTableShape['props'] {
    return {
      w: TABLE_NODE_VISUAL_WIDTH,
      h: TABLE_NODE_VISUAL_ROW_HEIGHT,
      nodeId: '',
      tableData: EMPTY_TABLE_NODE_DATA,
    }
  }

  override component(shape: SchemaTableShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: 'all',
        }}
      >
        <SchemaTableContent graphNodeId={shape.props.nodeId} data={shape.props.tableData} />
      </HTMLContainer>
    )
  }

  override indicator(shape: SchemaTableShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={4} ry={4} />
  }
}

class SchemaRelationArrowUtil extends ArrowShapeUtil {
  static override type = 'arrow' as const

  override canEdit() {
    return false
  }

  override getHandles(_shape: TldrawArrowShape) {
    return []
  }

  override hideSelectionBoundsBg() {
    return true
  }

  override hideSelectionBoundsFg() {
    return true
  }
}

const getShapeIdSuffix = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-')
const getTableShapeId = (nodeId: string) => createShapeId(`schema-table-${getShapeIdSuffix(nodeId)}`)
const getRelationShapeId = (edgeId: string) =>
  createShapeId(`schema-relation-${getShapeIdSuffix(edgeId)}`)

const isSchemaTableShape = (shape: any): shape is SchemaTableShape =>
  shape?.type === SCHEMA_TABLE_SHAPE_TYPE

const isSchemaRelationArrow = (shape: TldrawShape | null | undefined): shape is TldrawArrowShape =>
  shape?.type === 'arrow' && shape.meta?.[SCHEMA_RELATION_META_KEY] != null

const getTableShapeHeight = (tableData: TableNodeData) =>
  tableData.isForeign ? TABLE_NODE_VISUAL_ROW_HEIGHT : TABLE_NODE_VISUAL_ROW_HEIGHT * (tableData.columns.length + 1)

const getColumnAnchor = (
  tableData: TableNodeData,
  handleId: string | null | undefined,
  terminal: 'start' | 'end'
) => {
  const shapeHeight = getTableShapeHeight(tableData)

  if (tableData.isForeign || tableData.columns.length === 0) {
    return {
      x: terminal === 'start' ? 1 : 0,
      y: 0.5,
    }
  }

  const columnIndex = tableData.columns.findIndex((column) => column.id === handleId)
  const rowIndex = columnIndex >= 0 ? columnIndex + 1 : 0

  return {
    x: terminal === 'start' ? 1 : 0,
    y:
      (TABLE_NODE_VISUAL_ROW_HEIGHT * rowIndex + TABLE_NODE_VISUAL_ROW_HEIGHT / 2) /
      shapeHeight,
  }
}

const getEdgePointFromNode = (
  node: Node<TableNodeData>,
  position: { x: number; y: number },
  handleId: string | null | undefined,
  terminal: 'start' | 'end'
) => {
  const anchor = getColumnAnchor(node.data, handleId, terminal)
  const shapeHeight = getTableShapeHeight(node.data)

  return {
    x: position.x + TABLE_NODE_VISUAL_WIDTH * anchor.x,
    y: position.y + shapeHeight * anchor.y,
  }
}

const getRelationSelection = (
  shape: TldrawShape | null | undefined
): SchemaRelationSelection | undefined => {
  if (!isSchemaRelationArrow(shape)) return undefined
  return shape.meta?.[SCHEMA_RELATION_META_KEY] as SchemaRelationSelection
}

const getMidpointAlongPolyline = (points: VecLike[], distance: number) => {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]

  let traversed = 0
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1]
    const end = points[i]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const segmentLength = Math.hypot(dx, dy)

    if (traversed + segmentLength >= distance) {
      const progress = segmentLength === 0 ? 0 : (distance - traversed) / segmentLength
      return {
        x: start.x + dx * progress,
        y: start.y + dy * progress,
      }
    }

    traversed += segmentLength
  }

  return points[points.length - 1]
}

const getArrowMidpointInPageSpace = (editor: TldrawEditor, shape: TldrawArrowShape) => {
  const arrowInfo = getArrowInfo(editor, shape)
  const transform = editor.getShapePageTransform(shape)

  if (!arrowInfo || !transform) return undefined

  if (arrowInfo.type === 'straight') {
    return Mat.applyToPoint(transform, arrowInfo.middle)
  }

  if (arrowInfo.type === 'elbow' && arrowInfo.route != null) {
    return Mat.applyToPoint(
      transform,
      getMidpointAlongPolyline(arrowInfo.route.points, arrowInfo.route.distance / 2)
    )
  }

  return Mat.applyToPoint(transform, {
    x: (arrowInfo.start.point.x + arrowInfo.end.point.x) / 2,
    y: (arrowInfo.start.point.y + arrowInfo.end.point.y) / 2,
  })
}

const getScreenRectForShape = (editor: TldrawEditor, shapeId: import('tldraw').TLShapeId) => {
  const bounds = editor.getShapePageBounds(shapeId)
  if (!bounds) return undefined

  const topLeft = editor.pageToScreen({ x: bounds.x, y: bounds.y })
  const bottomRight = editor.pageToScreen({
    x: bounds.x + bounds.width,
    y: bounds.y + bounds.height,
  })

  return {
    left: Math.min(topLeft.x, bottomRight.x),
    right: Math.max(topLeft.x, bottomRight.x),
    top: Math.min(topLeft.y, bottomRight.y),
    bottom: Math.max(topLeft.y, bottomRight.y),
  }
}

const rectsIntersect = (
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)

const isInteractiveKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.closest(
      'button,a,input,textarea,select,[role="menuitem"],[role="menu"],[contenteditable="true"]'
    ) != null
  )
}

const EdgeNodeData = ({
  schema,
  table,
  column,
}: {
  schema: string
  table: string
  column: string
}) => {
  const { selectedSchema } = useQuerySchemaState()

  return (
    <Badge className="normal-case text-[8px]">
      {selectedSchema === schema ? '' : `${schema}.`}
      {table}.{column}
    </Badge>
  )
}

const SchemaRelationBadge = ({
  selectedShape,
}: {
  selectedShape:
    | {
        shape: TldrawArrowShape
        relation: SchemaRelationSelection
      }
    | undefined
}) => {
  const editor = useEditor()
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const [show, setShow] = useState(false)

  const badgeData = useValue(
    'schema-relation-badge',
    () => {
      if (selectedShape == null) return undefined

      const midpoint = getArrowMidpointInPageSpace(editor, selectedShape.shape)
      if (!midpoint) return undefined

      const sourceShape = editor.getShape(getTableShapeId(selectedShape.relation.source))
      const targetShape = editor.getShape(getTableShapeId(selectedShape.relation.target))
      if (!sourceShape || !targetShape) return undefined

      const sourceRect = getScreenRectForShape(editor, sourceShape.id)
      const targetRect = getScreenRectForShape(editor, targetShape.id)
      if (!sourceRect || !targetRect) return undefined

      const screenPoint = editor.pageToScreen(midpoint)

      return {
        point: screenPoint,
        relation: selectedShape.relation,
        sourceRect,
        targetRect,
        isSourceLeading: sourceRect.left < targetRect.left,
      }
    },
    [editor, selectedShape]
  )

  useEffect(() => {
    if (badgeData == null || badgeRef.current == null) {
      setShow(false)
      return
    }

    const badgeRect = badgeRef.current.getBoundingClientRect()
    const badgeBounds = {
      left: badgeRect.left,
      right: badgeRect.right,
      top: badgeRect.top,
      bottom: badgeRect.bottom,
    }

    setShow(
      !rectsIntersect(badgeData.sourceRect, badgeBounds) &&
        !rectsIntersect(badgeData.targetRect, badgeBounds)
    )
  }, [badgeData, editor])

  if (badgeData?.relation.data == null) return null

  const { data } = badgeData.relation

  const sourceNode = (
    <EdgeNodeData
      schema={data.sourceSchemaName}
      table={data.sourceName}
      column={data.sourceColumnName}
    />
  )

  const targetNode = (
    <EdgeNodeData
      schema={data.targetSchemaName}
      table={data.targetName}
      column={data.targetColumnName}
    />
  )

  return (
    <div
      ref={badgeRef}
      className={cn(
        'absolute pointer-events-none z-50 p-1 rounded-[4px] gap-1 outline outline-1 outline-brand inline-flex items-center bg-background transition-opacity',
        show ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        left: badgeData.point.x,
        top: badgeData.point.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {badgeData.relation.sourceHandle != null &&
      badgeData.relation.targetHandle != null &&
      badgeData.point.x >= 0 ? (
        badgeData.isSourceLeading ? (
          <>
            {sourceNode}
            <ArrowRight size={12} />
            {targetNode}
          </>
        ) : (
          <>
            {targetNode}
            <ArrowLeft size={12} />
            {sourceNode}
          </>
        )
      ) : null}
    </div>
  )
}

const SchemaTldrawCanvasOverlay = ({
  onSelectedEdgeChange,
}: {
  onSelectedEdgeChange: (value: SchemaRelationSelection | undefined) => void
}) => {
  const editor = useEditor()

  const selectedShape = useValue(
    'schema-selected-arrow',
    () => {
      const shape = editor.getOnlySelectedShape()
      const relation = getRelationSelection(shape)
      return shape != null && relation != null && isSchemaRelationArrow(shape)
        ? { shape, relation }
        : undefined
    },
    [editor]
  )

  useEffect(() => {
    onSelectedEdgeChange(selectedShape?.relation)
  }, [onSelectedEdgeChange, selectedShape])

  return (
    <>
      <SchemaRelationBadge selectedShape={selectedShape} />
    </>
  )
}

const SchemaTldrawEditorBridge = ({
  onEditorReady,
}: {
  onEditorReady: (editor: TldrawEditor) => void
}) => {
  const editor = useEditor()

  useEffect(() => {
    onEditorReady(editor)
  }, [editor, onEditorReady])

  return null
}

const preventDiagramHotkeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
  if (event.key === 'Tab' || isInteractiveKeyboardTarget(event.target)) return
  event.preventDefault()
  event.stopPropagation()
}

export const SchemaGraphTldraw = ({ mockPreset }: { mockPreset?: SchemaGraphMockPreset }) => {
  const { ref } = useParams()
  const { resolvedTheme } = useTheme()
  const { data: project } = useSelectedProjectQuery()
  const { selectedSchema, setSelectedSchema } = useQuerySchemaState()
  const [selectedTable, setSelectedTable] = useState<PostgresTable | null>(null)
  const [editor, setEditor] = useState<TldrawEditor | null>(null)
  const snap = useTableEditorStateSnapshot()

  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return undefined
    const timeout = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const [isDownloading, setIsDownloading] = useState(false)
  const canvasShellRef = useRef<HTMLDivElement | null>(null)
  const persistTimeoutRef = useRef<number | undefined>(undefined)
  const isFirstLoad = useRef(true)

  const mockData = useMemo(
    () =>
      mockPreset
        ? createMockSchemaGraphData({
            schemaName: selectedSchema || 'public',
          })
        : undefined,
    [mockPreset, selectedSchema]
  )

  const {
    data: fetchedSchemas,
    error: fetchedSchemasError,
    isSuccess: isFetchedSchemasSuccess,
    isPending: isFetchedSchemasLoading,
    isError: isFetchedSchemasError,
  } = useSchemasQuery(
    {
      projectRef: project?.ref,
      connectionString: project?.connectionString,
    },
    { enabled: mockData == null }
  )

  const {
    data: fetchedTables = [],
    error: fetchedTablesError,
    isSuccess: isFetchedTablesSuccess,
    isPending: isFetchedTablesLoading,
    isError: isFetchedTablesError,
  } = useTablesQuery(
    {
      projectRef: project?.ref,
      connectionString: project?.connectionString,
      schema: selectedSchema,
      includeColumns: true,
    },
    { enabled: mockData == null }
  )

  const schemas = mockData?.schemas ?? fetchedSchemas
  const tables = mockData?.tables ?? fetchedTables
  const errorSchemas = mockData == null ? fetchedSchemasError : undefined
  const errorTables = mockData == null ? fetchedTablesError : undefined
  const isSuccessSchemas = mockData != null || isFetchedSchemasSuccess
  const isSuccessTables = mockData != null || isFetchedTablesSuccess
  const isLoadingSchemas = mockData == null && isFetchedSchemasLoading
  const isLoadingTables = mockData == null && isFetchedTablesLoading
  const isErrorSchemas = mockData == null && isFetchedSchemasError
  const isErrorTables = mockData == null && isFetchedTablesError

  const hasNoTables = isSuccessSchemas && tables.length === 0
  const schema = (schemas ?? []).find((item) => item.name === selectedSchema)
  const [, setStoredPositions] = useLocalStorage(
    LOCAL_STORAGE_KEYS.SCHEMA_VISUALIZER_POSITIONS(ref as string, schema?.id ?? 0),
    {}
  )

  const { can: canUpdateTables } = useAsyncCheckPermissions(
    PermissionAction.TENANT_SQL_ADMIN_WRITE,
    'tables'
  )

  const { isSchemaLocked } = useIsProtectedSchema({ schema: selectedSchema })
  const canAddTables = canUpdateTables && !isSchemaLocked

  const [selectedEdge, setSelectedEdge] = useState<SchemaRelationSelection | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current != null) {
        window.clearTimeout(persistTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!editor) return

    editor.setCameraOptions({
      ...editor.getCameraOptions(),
      zoomSteps: ZOOM_STEPS,
    })
    editor.user.updateUserPreferences({
      colorScheme: resolvedTheme?.includes('dark') ? 'dark' : 'light',
    })
  }, [editor, resolvedTheme])

  useEffect(() => {
    if (editor == null) return

    const relationShapes = (editor.getCurrentPageShapes() as TldrawShape[]).filter(isSchemaRelationArrow)
    if (relationShapes.length === 0) return

    editor.run(
      () => {
        editor.updateShapes(
          relationShapes.map((shape) => {
            const relation = getRelationSelection(shape)
            return {
              id: shape.id,
              type: 'arrow',
              props: {
                color: relation?.id === selectedEdge?.id ? ('green' as const) : ('grey' as const),
              },
            }
          }) as any
        )
      },
      { history: 'ignore' }
    )
  }, [editor, selectedEdge])

  const saveNodePositions = useStaticEffectEvent(() => {
    if (editor == null || schema == null) return

    const positions = (editor.getCurrentPageShapes() as any[])
      .filter(isSchemaTableShape)
      .reduce<Record<string, { x: number; y: number }>>((acc, shape) => {
        acc[shape.props.nodeId] = { x: shape.x, y: shape.y }
        return acc
      }, {})

    setStoredPositions(positions)
  })

  const syncGraph = useStaticEffectEvent(
    (
      graphNodes: Node<TableNodeData>[],
      graphEdges: Edge<EdgeData>[],
      options?: { fitView?: boolean }
    ) => {
      if (editor == null) return

      const currentShapes = editor.getCurrentPageShapes() as any[]
      const existingTableShapes = new Map(
        currentShapes.filter(isSchemaTableShape).map((shape) => [shape.props.nodeId, shape])
      )
      const existingRelationShapeIds = currentShapes
        .filter(isSchemaRelationArrow)
        .map((shape) => shape.id)
      const graphNodesById = new Map(graphNodes.map((node) => [node.id, node]))

      const nextTableIds = new Set(graphNodes.map((node) => node.id))
      const shapesToDelete = [...existingTableShapes.values()]
        .filter((shape) => !nextTableIds.has(shape.props.nodeId))
        .map((shape) => shape.id)

      const shapesToCreate: any[] = []
      const shapesToUpdate: any[] = []
      const positionsByNodeId = new Map<string, { x: number; y: number }>()

      graphNodes.forEach((node) => {
        const shapeHeight = getTableShapeHeight(node.data)
        const props = {
          w: TABLE_NODE_VISUAL_WIDTH,
          h: shapeHeight,
          nodeId: node.id,
          tableData: node.data,
        }
        const existingShape = existingTableShapes.get(node.id)

        if (existingShape) {
          positionsByNodeId.set(node.id, { x: existingShape.x, y: existingShape.y })
          shapesToUpdate.push({
            id: existingShape.id,
            type: SCHEMA_TABLE_SHAPE_TYPE,
            props,
          })
        } else {
          positionsByNodeId.set(node.id, node.position)
          shapesToCreate.push({
            id: getTableShapeId(node.id),
            type: SCHEMA_TABLE_SHAPE_TYPE,
            x: node.position.x,
            y: node.position.y,
            props,
          })
        }
      })

      const relationShapes = graphEdges
        .map((edge) => {
          const sourceNode = graphNodesById.get(edge.source)
          const targetNode = graphNodesById.get(edge.target)
          const sourcePosition = positionsByNodeId.get(edge.source)
          const targetPosition = positionsByNodeId.get(edge.target)

          if (!sourceNode || !targetNode || !sourcePosition || !targetPosition) return undefined

          return {
            id: getRelationShapeId(edge.id),
            type: 'arrow' as const,
            x: 0,
            y: 0,
            props: {
              kind: 'elbow' as const,
              dash: 'solid' as const,
              size: 's' as const,
              fill: 'none' as const,
              color: edge.id === selectedEdge?.id ? ('green' as const) : ('grey' as const),
              bend: 0,
              start: getEdgePointFromNode(sourceNode, sourcePosition, edge.sourceHandle, 'start'),
              end: getEdgePointFromNode(targetNode, targetPosition, edge.targetHandle, 'end'),
              arrowheadStart: 'none' as const,
              arrowheadEnd: 'arrow' as const,
              elbowMidPoint: 0.5,
            },
            meta: {
              [SCHEMA_RELATION_META_KEY]: {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                data: edge.data,
              } satisfies SchemaRelationSelection,
            },
          }
        })
        .filter((shape): shape is NonNullable<typeof shape> => shape != null)

      editor.run(
        () => {
          if (shapesToDelete.length > 0) editor.deleteShapes(shapesToDelete)
          if (existingRelationShapeIds.length > 0) editor.deleteShapes(existingRelationShapeIds)
          if (shapesToCreate.length > 0) editor.createShapes(shapesToCreate as any)
          if (shapesToUpdate.length > 0) editor.updateShapes(shapesToUpdate as any)
          if (relationShapes.length > 0) editor.createShapes(relationShapes)

          relationShapes.forEach((shape) => {
            const relation = shape.meta[SCHEMA_RELATION_META_KEY] as SchemaRelationSelection
            const sourceNode = graphNodesById.get(relation.source)
            const targetNode = graphNodesById.get(relation.target)
            if (!sourceNode || !targetNode) return

            editor.createBinding({
              type: 'arrow',
              fromId: shape.id,
              toId: getTableShapeId(relation.source),
              props: {
                terminal: 'start',
                normalizedAnchor: getColumnAnchor(
                  sourceNode.data,
                  relation.sourceHandle,
                  'start'
                ),
                isPrecise: true,
                isExact: false,
                snap: 'none',
              },
            })
            editor.createBinding({
              type: 'arrow',
              fromId: shape.id,
              toId: getTableShapeId(relation.target),
              props: {
                terminal: 'end',
                normalizedAnchor: getColumnAnchor(targetNode.data, relation.targetHandle, 'end'),
                isPrecise: true,
                isExact: false,
                snap: 'none',
              },
            })
          })

          if (relationShapes.length > 0) {
            editor.sendToBack(relationShapes.map((shape) => shape.id))
          }
        },
        { history: 'ignore' }
      )

      if (options?.fitView) {
        window.setTimeout(() => editor.zoomToFit(), 0)
      }
    }
  )

  useEffect(() => {
    if (editor == null || schema == null) return undefined

    const unsubscribe = editor.sideEffects.registerAfterChangeHandler(
      'shape',
      (previous: any, next: any) => {
        if (!isSchemaTableShape(previous) || !isSchemaTableShape(next)) return
        if (previous.x === next.x && previous.y === next.y) return

        if (persistTimeoutRef.current != null) {
          window.clearTimeout(persistTimeoutRef.current)
        }

        persistTimeoutRef.current = window.setTimeout(() => {
          saveNodePositions()
        }, 150)
      }
    )

    return () => {
      unsubscribe?.()
    }
  }, [editor, saveNodePositions, schema])

  useEffect(() => {
    if (editor == null || !isSuccessTables || !isSuccessSchemas || tables.length === 0) return undefined

    let cancelled = false

    const currentSchema = (schemas ?? []).find((item) => item.name === selectedSchema) as PostgresSchema

    getGraphDataFromTables(ref as string, currentSchema, tables).then(({ nodes, edges }) => {
      if (cancelled) return
      syncGraph(nodes, edges as Edge<EdgeData>[], { fitView: isFirstLoad.current })
      if (isFirstLoad.current) isFirstLoad.current = false
    })

    return () => {
      cancelled = true
    }
  }, [editor, isSuccessSchemas, isSuccessTables, ref, schemas, selectedSchema, syncGraph, tables])

  const resetLayout = async () => {
    if (editor == null || schema == null) return

    const { nodes } = await getGraphDataFromTables(ref as string, schema, tables)

    editor.run(
      () => {
        editor.updateShapes(
          nodes.map((node) => ({
            id: getTableShapeId(node.id),
            type: SCHEMA_TABLE_SHAPE_TYPE,
            x: node.position.x,
            y: node.position.y,
          })) as any
        )
      },
      { history: 'ignore' }
    )

    window.setTimeout(() => editor.zoomToFit(), 0)
    saveNodePositions()
  }

  const downloadImage = async (format: 'png' | 'svg') => {
    if (canvasShellRef.current == null) return

    setIsDownloading(true)

    try {
      const width = canvasShellRef.current.clientWidth
      const height = canvasShellRef.current.clientHeight
      const exportFn = format === 'svg' ? toSvg : toPng
      const data = await exportFn(canvasShellRef.current, {
        backgroundColor: 'white',
        width,
        height,
      })

      const link = document.createElement('a')
      link.setAttribute('download', `supabase-schema-${ref}.${format}`)
      link.setAttribute('href', data)
      link.click()

      toast.success(`Successfully downloaded as ${format.toUpperCase()}`)
    } catch (error: any) {
      console.error('Failed to download:', error)
      toast.error('Failed to download current view:', error?.message)
    } finally {
      setIsDownloading(false)
    }
  }

  const schemaGraphPanelEditorContext = useMemo<SchemaGraphContextType>(
    () => ({
      selectedEdge,
      isDownloading,
      onEditColumn: (tableId, columnId) => {
        if (mockData != null) {
          toast.info('Stress test graph is read-only')
          return
        }

        const table = tables.find((tableItem) => tableItem.id === tableId)
        if (!table || table.columns == null) return

        const column = table.columns.find((columnItem) => columnItem.id === columnId)
        if (!column) return

        setSelectedTable(table)
        snap.onEditColumn(column)
      },
      onEditTable: (tableId) => {
        if (mockData != null) {
          toast.info('Stress test graph is read-only')
          return
        }

        const table = tables.find((tableItem) => tableItem.id === tableId)
        if (!table || table.columns == null) return

        setSelectedTable(table)
        snap.onEditTable()
      },
    }),
    [isDownloading, mockData, selectedEdge, snap, tables]
  )

  const tldrawComponents = useMemo(
    () => ({
      InFrontOfTheCanvas: () => <SchemaTldrawCanvasOverlay onSelectedEdgeChange={setSelectedEdge} />,
    }),
    []
  )

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-muted h-[var(--header-height)]">
        {isLoadingSchemas && (
          <div className="h-[34px] w-[260px] bg-foreground-lighter rounded shimmering-loader" />
        )}

        {isErrorSchemas && (
          <AlertError error={errorSchemas as any} subject="Failed to retrieve schemas" />
        )}

        {isSuccessSchemas && (
          <>
            <div className="flex items-center gap-x-2">
              {mockData == null ? (
                <SchemaSelector
                  className="w-[180px]"
                  size="tiny"
                  showError={false}
                  selectedSchemaName={selectedSchema}
                  onSelectSchema={setSelectedSchema}
                />
              ) : (
                <>
                  <Badge>{selectedSchema}</Badge>
                  <Badge>Mock 100 tables x 10 columns</Badge>
                </>
              )}
            </div>
            {!hasNoTables && (
              <div className="flex items-center gap-x-2">
                <ButtonTooltip
                  type="outline"
                  icon={copied ? <Check data-testid="copy-sql-ready" /> : <Copy />}
                  onClick={() => {
                    copyToClipboard(tablesToSQL(tables))
                    setCopied(true)
                  }}
                  tooltip={{
                    content: {
                      side: 'bottom',
                      text: (
                        <div className="max-w-[180px] space-y-2 text-foreground-light">
                          <p className="text-foreground">Note</p>
                          <p>
                            This schema is for context or debugging only. Table order and
                            constraints may be invalid. Not meant to be run as-is.
                          </p>
                        </div>
                      ),
                    },
                  }}
                >
                  Copy as SQL
                </ButtonTooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ButtonTooltip
                      aria-label="Download Schema"
                      type="default"
                      loading={isDownloading}
                      className="px-1.5"
                      icon={<Download />}
                      tooltip={{ content: { side: 'bottom', text: 'Download current view' } }}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-32">
                    <DropdownMenuItem onClick={() => downloadImage('png')}>
                      Download as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadImage('svg')}>
                      Download as SVG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ButtonTooltip
                  type="default"
                  onClick={resetLayout}
                  tooltip={{
                    content: {
                      side: 'bottom',
                      text: 'Automatically arrange the layout of all nodes',
                    },
                  }}
                >
                  Auto layout
                </ButtonTooltip>
              </div>
            )}
          </>
        )}
      </div>
      {isLoadingTables && (
        <div className="w-full h-full flex items-center justify-center gap-x-2">
          <Loader2 className="animate-spin text-foreground-light" size={16} />
          <p className="text-sm text-foreground-light">Loading tables</p>
        </div>
      )}
      {isErrorTables && (
        <div className="w-full h-full flex items-center justify-center px-20">
          <AlertError subject="Failed to retrieve tables" error={errorTables} />
        </div>
      )}
      {isSuccessTables && (
        <>
          {hasNoTables ? (
            <div className="flex items-center justify-center w-full h-full">
              <Admonition
                type="default"
                className="max-w-md"
                title="No tables in schema"
                description={
                  isSchemaLocked
                    ? `The “${selectedSchema}” schema is managed by Supabase and is read-only through
                    the dashboard.`
                    : !canUpdateTables
                      ? 'You need additional permissions to create tables'
                      : `The “${selectedSchema}” schema doesn’t have any tables.`
                }
              >
                {canAddTables && (
                  <Button asChild className="mt-2" type="default" icon={<Plus />}>
                    <Link href={`/project/${ref}/editor?create=table`}>New table</Link>
                  </Button>
                )}
              </Admonition>
            </div>
          ) : (
            <SchemaGraphContextProvider value={schemaGraphPanelEditorContext}>
              <div className="w-full h-full relative overflow-hidden">
                <div
                  ref={canvasShellRef}
                  className={cn(
                    'absolute inset-0 overflow-hidden',
                    '[&_.tl-canvas]:!bg-transparent',
                    '[&_.tl-html-layer]:!overflow-visible'
                  )}
                >
                  <div className="pointer-events-none absolute inset-0 text-foreground-muted opacity-[25%] [background-image:radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="absolute inset-0" onKeyDownCapture={preventDiagramHotkeys}>
                    <Tldraw
                      hideUi
                      components={tldrawComponents}
                      shapeUtils={[SchemaTableShapeUtil, SchemaRelationArrowUtil]}
                      options={{ maxPages: 1 }}
                    >
                      <SchemaTldrawEditorBridge onEditorReady={setEditor} />
                    </Tldraw>
                  </div>
                </div>
                <SchemaGraphLegend />
              </div>
            </SchemaGraphContextProvider>
          )}
        </>
      )}
      <SidePanelEditor selectedTable={selectedTable ?? undefined} includeColumns />
    </>
  )
}
