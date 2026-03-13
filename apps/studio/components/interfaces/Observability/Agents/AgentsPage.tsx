import { useParams } from 'common'
import AlertError from 'components/ui/AlertError'
import { useAgentTasksQuery } from 'data/project-meta/agent-tasks-query'
import { useAgentCreateMutation } from 'data/project-meta/agents-create-mutation'
import { useAgentDeleteMutation } from 'data/project-meta/agents-delete-mutation'
import { useAgentsQuery } from 'data/project-meta/agents-query'
import { useAgentUpdateMutation } from 'data/project-meta/agents-update-mutation'
import type { Agent, AgentTask } from 'data/project-meta/types'
import { MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
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
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { AgentSheet } from './AgentSheet'

export const ObservabilityAgentsPage = () => {
  const { ref: projectRef } = useParams()
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null)

  const {
    data: agents,
    error: agentsError,
    isPending: isLoadingAgents,
  } = useAgentsQuery({
    projectRef,
  })
  const {
    data: tasks,
    error: tasksError,
    isPending: isLoadingTasks,
  } = useAgentTasksQuery({
    projectRef,
  })

  const { mutate: createAgent, isPending: isCreating } = useAgentCreateMutation()
  const { mutate: updateAgent, isPending: isUpdating } = useAgentUpdateMutation()
  const { mutate: deleteAgent, isPending: isDeleting } = useAgentDeleteMutation()

  const tasksByAgent = useMemo(() => {
    return (tasks ?? []).reduce(
      (acc, task) => {
        acc[task.agent_id] = [...(acc[task.agent_id] ?? []), task]
        return acc
      },
      {} as Record<string, AgentTask[]>
    )
  }, [tasks])

  const filteredAgents = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return agents ?? []

    return (agents ?? []).filter((agent) => {
      const agentTasks = tasksByAgent[agent.id] ?? []
      return (
        [agent.name, agent.summary, agent.system_prompt]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle)) ||
        agentTasks.some((task) =>
          [task.name, task.description, task.schedule]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(needle))
        )
      )
    })
  }, [agents, search, tasksByAgent])

  const error = agentsError ?? tasksError
  const isLoading = isLoadingAgents || isLoadingTasks

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search agents or tasks"
            icon={<Search />}
            size="tiny"
            className="w-full sm:w-80"
          />

          <Button
            type="primary"
            icon={<Plus />}
            onClick={() => {
              setSelectedAgent(null)
              setSheetOpen(true)
            }}
          >
            New agent
          </Button>
        </div>

        {error ? (
          <AlertError error={error} subject="Failed to retrieve agents" />
        ) : isLoading ? (
          <GenericSkeletonLoader />
        ) : filteredAgents.length === 0 ? (
          <EmptyStatePresentational
            title={agents?.length ? 'No matching agents' : 'No agents yet'}
            description={
              agents?.length
                ? 'Try a different search term or create a new agent.'
                : 'Create an agent to manage prompts, tasks, and activity in one place.'
            }
          >
            <Button
              type="default"
              icon={<Plus />}
              onClick={() => {
                setSelectedAgent(null)
                setSheetOpen(true)
              }}
            >
              Create agent
            </Button>
          </EmptyStatePresentational>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredAgents.map((agent) => {
                  const agentTasks = tasksByAgent[agent.id] ?? []
                  const visibleTools = agent.tools.slice(0, 2)
                  const hiddenToolsCount = Math.max(agent.tools.length - visibleTools.length, 0)

                  return (
                    <TableRow key={agent.id}>
                      <TableCell className="max-w-[360px]">
                        <div className="space-y-1">
                          <Link
                            href={`/project/${projectRef}/observability/agents/${agent.id}`}
                            className="block truncate font-medium text-sm text-foreground hover:underline"
                          >
                            {agent.name}
                          </Link>
                          <p className="truncate text-xs text-foreground-light">
                            {agent.summary || 'No summary'}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-wrap gap-2">
                          {visibleTools.length > 0 ? (
                            <>
                              {visibleTools.map((tool) => (
                                <Badge key={tool} variant="default">
                                  {tool}
                                </Badge>
                              ))}
                              {hiddenToolsCount > 0 && (
                                <Badge variant="default">+{hiddenToolsCount} more</Badge>
                              )}
                            </>
                          ) : (
                            <Badge variant="default">No tools</Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>{agentTasks.length}</TableCell>

                      <TableCell>
                        <TimestampInfo className="text-xs" utcTimestamp={agent.updated_at} />
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
                                setSelectedAgent(agent)
                                setSheetOpen(true)
                              }}
                            >
                              <Pencil size={14} />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => setDeleteTarget(agent)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <AgentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialValues={selectedAgent}
        isSubmitting={isCreating || isUpdating}
        onSubmit={(values) => {
          if (!projectRef) return

          const onSuccess = () => {
            setSheetOpen(false)
            setSelectedAgent(null)
          }

          if (selectedAgent) {
            updateAgent(
              {
                projectRef,
                id: selectedAgent.id,
                ...values,
              },
              { onSuccess }
            )
          } else {
            createAgent(
              {
                projectRef,
                ...values,
              },
              { onSuccess }
            )
          }
        }}
      />

      <ConfirmationModal
        visible={deleteTarget !== null}
        title="Delete agent"
        description={`Delete "${deleteTarget?.name}" and its scheduled tasks?`}
        confirmLabel="Delete agent"
        confirmLabelLoading="Deleting agent"
        variant="destructive"
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!projectRef || !deleteTarget) return

          deleteAgent(
            { projectRef, id: deleteTarget.id },
            {
              onSuccess: () => {
                setDeleteTarget(null)
              },
            }
          )
        }}
      />
    </>
  )
}
