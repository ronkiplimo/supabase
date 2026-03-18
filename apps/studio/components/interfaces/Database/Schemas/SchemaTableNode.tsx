import {
  closestCenter,
  DndContext,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  type AnimateLayoutChanges,
} from '@dnd-kit/sortable'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import { buildTableEditorUrl } from 'components/grid/SupabaseGrid.utils'
import { TableEditor } from 'icons'
import {
  Copy,
  DiamondIcon,
  Edit,
  Fingerprint,
  GripVertical,
  Hash,
  InfoIcon,
  Key,
  MoreVertical,
  Table2,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow'
import {
  Button,
  cn,
  copyToClipboard,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'ui'

import { useSchemaGraphContext } from './SchemaGraphContext'
import type { TableNodeColumnData, TableNodeData } from './SchemaTableNode.types'
import { useTableOrderedColumns } from './useTableOrderedColumns'
import { useAsyncCheckPermissions } from '@/hooks/misc/useCheckPermissions'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { useStaticEffectEvent } from '@/hooks/useStaticEffectEvent'

// ReactFlow is scaling everything by the factor of 2
export const TABLE_NODE_WIDTH = 320
export const TABLE_NODE_ROW_HEIGHT = 40

const itemHeight = 'h-[22px]'
// Important styles is a nasty hack to use Handles (required for edges calculations), but do not show them in the UI.
// ref: https://github.com/wbkd/react-flow/discussions/2698
const hiddenNodeConnector = '!h-px !w-px !min-w-0 !min-h-0 !cursor-grab !border-0 !opacity-0'

export const TableNode = ({
  data,
  targetPosition,
  sourcePosition,
  placeholder,
}: NodeProps<TableNodeData> & { placeholder?: boolean }) => {
  const schemaGraphContext = useSchemaGraphContext()
  const { data: project } = useSelectedProjectQuery()
  const router = useRouter()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [columns, persistColumns] = useTableOrderedColumns({
    projectRef: project?.ref,
    table: data,
  })
  const handleDragEnd = useStaticEffectEvent((event: DragEndEvent) => {
    const { active, over } = event

    if (over) {
      const overIndex = columns.findIndex((column) => column.id === over.id)
      const activeIndex = columns.findIndex((column) => column.id === active.id)
      if (activeIndex !== overIndex) {
        const newColumns = arrayMove(columns, activeIndex, overIndex)
        persistColumns(newColumns)
      }
    }
  })

  return (
    <article>
      {data.isForeign ? (
        <header className="text-[0.55rem] px-2 py-1 border-[0.5px] rounded-[4px] bg-alternative flex gap-1 items-center">
          {data.name}
          {targetPosition && (
            <Handle
              type="target"
              id={data.name}
              position={targetPosition}
              className={cn(hiddenNodeConnector)}
            />
          )}
        </header>
      ) : (
        <div
          className="border-[0.5px] rounded-[4px] shadow-sm"
          style={{ width: TABLE_NODE_WIDTH / 2 }}
        >
          <header
            className={cn(
              'text-[0.55rem] pl-2 pr-1 bg-alternative flex gap-2 items-center justify-between',
              itemHeight
            )}
          >
            <div className="min-w-0 flex flex-shrink gap-x-1 items-center">
              <Table2 strokeWidth={1} size={12} className="text-light" />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis" title={data.name}>
                {data.name}
              </span>
            </div>
            {
              // Hide the actions while downloading the schema as png/svg
              !schemaGraphContext.isDownloading ? (
                <div className="flex flex-shrink-0 items-center gap-2">
                  {data.description && (
                    <Tooltip>
                      <TooltipTrigger asChild className="cursor-default ">
                        <InfoIcon size={10} className="text-light" />
                      </TooltipTrigger>
                      <TooltipContent side="top">{data.description}</TooltipContent>
                    </Tooltip>
                  )}

                  {!placeholder && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="text" className="px-0 w-[16px] h-[16px] rounded nodrag nopan">
                          <MoreVertical size={10} />
                          <span className="sr-only">{data.name} actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="bottom" align="end" className="w-40">
                        <DropdownMenuItem
                          className="flex items-center space-x-2 whitespace-nowrap"
                          onClick={() => schemaGraphContext.onEditTable(data.id)}
                        >
                          <Edit size={12} />
                          <p>Edit table</p>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center space-x-2 whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(data.name)
                          }}
                        >
                          <Copy size={12} />
                          <span>Copy name</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center space-x-2 whitespace-nowrap"
                          onClick={() =>
                            router.push(
                              buildTableEditorUrl({
                                projectRef: project?.ref,
                                tableId: data.id,
                                schema: data.schema,
                              })
                            )
                          }
                        >
                          <TableEditor size={12} />
                          <p>View in Table Editor</p>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ) : null
            }
          </header>
          <main className="flex flex-col relative">
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              collisionDetection={closestCenter}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            >
              <SortableContext items={columns} strategy={verticalListSortingStrategy}>
                {columns.map((column) => (
                  <SchemaTableColumn
                    key={column.id}
                    column={column}
                    table={data}
                    targetPosition={targetPosition}
                    sourcePosition={sourcePosition}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </main>
        </div>
      )}
    </article>
  )
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

const SchemaTableColumn = ({
  column,
  table,
  targetPosition,
  sourcePosition,
}: {
  column: TableNodeColumnData
  table: TableNodeData
  targetPosition: Position | undefined
  sourcePosition: Position | undefined
}) => {
  const schemaGraphContext = useSchemaGraphContext()
  const reactFlowInstance = useReactFlow()

  const { can: canUpdateColumns } = useAsyncCheckPermissions(
    PermissionAction.TENANT_SQL_ADMIN_WRITE,
    'columns'
  )

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    animateLayoutChanges,
  })

  // Ensure we handle the current react flow zoom as it would mess up the dragged element position otherwise
  const style = {
    transform: transform
      ? `translate3d(0px, ${transform.y / reactFlowInstance.getZoom()}px, 0)`
      : undefined,
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'text-[8px] leading-5 relative flex flex-row justify-items-start',
        'bg-surface-100',
        'border-t',
        'border-t-[0.5px]',
        'hover:bg-scale-500 transition cursor-default',
        'group',
        'pr-1',
        'will-change-transform',
        itemHeight,
        isDragging && 'opacity-70 z-10 shadow-md'
      )}
      data-testid={`${table.name}/${column.name}`}
    >
      <div
        className={cn(
          'gap-[0.24rem] flex ml-1 mr-2 align-middle items-center justify-start',
          column.isPrimary && 'basis-1/5'
        )}
      >
        <Button
          type="text"
          className="px-0 w-[16px] h-[16px] rounded nodrag nopan touch-none cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={8} />
          <span className="sr-only">Drag to reorder column</span>
        </Button>
        {column.isPrimary && (
          <Key
            size={8}
            strokeWidth={1}
            className={cn(
              // 'sb-grid-column-header__inner__primary-key'
              'flex-shrink-0',
              'text-light'
            )}
          />
        )}
        {column.isNullable ? (
          <DiamondIcon size={8} strokeWidth={1} className="flex-shrink-0 text-light" />
        ) : (
          <DiamondIcon
            size={8}
            strokeWidth={1}
            fill="currentColor"
            className="flex-shrink-0 text-light"
          />
        )}
        {column.isUnique && (
          <Fingerprint size={8} strokeWidth={1} className="flex-shrink-0 text-light" />
        )}
        {column.isIdentity && (
          <Hash size={8} strokeWidth={1} className="flex-shrink-0 text-light" />
        )}
      </div>
      <div className="flex w-full justify-between min-w-0">
        <span
          className="text-ellipsis overflow-hidden whitespace-nowrap min-w-0 max-w-[80%]"
          title={column.name}
        >
          {column.name}
        </span>
        <span className="flex-shrink-0 pl-2 pr-1 inline-flex justify-end font-mono text-lighter text-[0.4rem] group-hover:hidden">
          {column.format}
        </span>
      </div>
      {targetPosition && (
        <Handle
          type="target"
          id={column.id}
          position={targetPosition}
          className={cn(hiddenNodeConnector, '!left-0')}
        />
      )}
      {sourcePosition && (
        <Handle
          type="source"
          id={column.id}
          position={sourcePosition}
          className={cn(hiddenNodeConnector, '!right-0')}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="text"
            // Use opacity to hide the button so that it remains accessible (users can tab to it)
            className="opacity-0 focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 absolute right-0 top-1/2 -translate-y-1/2 px-0 mr-1 w-[16px] h-[16px] rounded"
          >
            <MoreVertical size={10} />
            <span className="sr-only">
              {table.name} {column.name} actions
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-32">
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                disabled={!canUpdateColumns}
                onClick={() => schemaGraphContext.onEditColumn(table.id, column.id)}
                className="space-x-2"
              >
                <Edit size={12} />
                <p>Edit column</p>
              </DropdownMenuItem>
            </TooltipTrigger>
            {!canUpdateColumns && (
              <TooltipContent side="bottom">
                Additional permissions required to edit column
              </TooltipContent>
            )}
          </Tooltip>

          <DropdownMenuItem
            className="space-x-2"
            onClick={(e) => {
              e.stopPropagation()
              copyToClipboard(column.name)
            }}
          >
            <Copy size={12} />
            <span>Copy name</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
