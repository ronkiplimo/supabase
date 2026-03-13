import { useParams } from 'common'
import AlertError from 'components/ui/AlertError'
import { useAgentQuery } from 'data/project-meta/agent-query'
import { useAgentTasksByAgentQuery } from 'data/project-meta/agent-tasks-by-agent-query'
import { useAgentTaskCreateMutation } from 'data/project-meta/agent-tasks-create-mutation'
import { useAgentTaskDeleteMutation } from 'data/project-meta/agent-tasks-delete-mutation'
import { useAgentTaskUpdateMutation } from 'data/project-meta/agent-tasks-update-mutation'
import type { AgentTask } from 'data/project-meta/types'
import { MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'ui'
import { EmptyStatePresentational, TimestampInfo } from 'ui-patterns'
import { Input } from 'ui-patterns/DataInputs/Input'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'
import { PageContainer } from 'ui-patterns/PageContainer'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { TaskSheet } from './TaskSheet'

export const AgentTasksList = () => {
  const { ref: projectRef, id } = useParams()
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgentTask | null>(null)

  const { data: agent } = useAgentQuery({ projectRef, id })
  const { data: tasks, error, isPending } = useAgentTasksByAgentQuery({ projectRef, id })
  const { mutate: createTask, isPending: isCreating } = useAgentTaskCreateMutation()
  const { mutate: updateTask, isPending: isUpdating } = useAgentTaskUpdateMutation()
  const { mutate: deleteTask, isPending: isDeleting } = useAgentTaskDeleteMutation()

  const filteredTasks = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return tasks ?? []

    return (tasks ?? []).filter((task) =>
      [task.name, task.description, task.schedule]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    )
  }, [search, tasks])

  return (
    <PageContainer size="full" className="py-6">
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
            icon={<Search />}
            size="tiny"
            className="w-full sm:w-80"
          />

          <Button
            type="primary"
            icon={<Plus />}
            onClick={() => {
              setSelectedTask(null)
              setSheetOpen(true)
            }}
          >
            New task
          </Button>
        </div>

        {error ? (
          <AlertError error={error} subject="Failed to retrieve tasks" />
        ) : isPending ? (
          <GenericSkeletonLoader />
        ) : filteredTasks.length === 0 ? (
          <EmptyStatePresentational
            title={tasks?.length ? 'No matching tasks' : 'No tasks yet'}
            description={
              tasks?.length
                ? 'Try a different search term or create a new task.'
                : 'Create a scheduled task to have this agent run automatically.'
            }
          >
            <Button
              type="default"
              icon={<Plus />}
              onClick={() => {
                setSelectedTask(null)
                setSheetOpen(true)
              }}
            >
              Create task
            </Button>
          </EmptyStatePresentational>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-[360px]">
                      <div className="space-y-1">
                        <p className="truncate font-medium text-sm">{task.name}</p>
                        <p className="truncate text-xs text-foreground-light">
                          {task.description || 'No description'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{task.schedule}</TableCell>
                    <TableCell>
                      <Badge variant="default">{task.is_unique ? 'Unique' : 'Parallel'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.enabled ? 'success' : 'default'}>
                        {task.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TimestampInfo className="text-xs" utcTimestamp={task.updated_at} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="text" icon={<MoreVertical />} className="w-7" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => {
                              setSelectedTask(task)
                              setSheetOpen(true)
                            }}
                          >
                            <Pencil size={14} />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => setDeleteTarget(task)}>
                            <Trash2 size={14} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <TaskSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setSelectedTask(null)
        }}
        initialValues={selectedTask}
        agentName={agent?.name}
        isSubmitting={isCreating || isUpdating}
        onSubmit={(values) => {
          if (!projectRef || !id) return

          const onSuccess = () => {
            setSheetOpen(false)
            setSelectedTask(null)
          }

          if (selectedTask) {
            updateTask(
              {
                projectRef,
                id: selectedTask.id,
                agent_id: id,
                ...values,
              },
              { onSuccess }
            )
          } else {
            createTask(
              {
                projectRef,
                agent_id: id,
                ...values,
              },
              { onSuccess }
            )
          }
        }}
      />

      <ConfirmationModal
        visible={deleteTarget !== null}
        title="Delete task"
        description={`Delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete task"
        confirmLabelLoading="Deleting task"
        variant="destructive"
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!projectRef || !id || !deleteTarget) return

          deleteTask(
            { projectRef, id: deleteTarget.id, agent_id: id },
            {
              onSuccess: () => {
                setDeleteTarget(null)
              },
            }
          )
        }}
      />
    </PageContainer>
  )
}
