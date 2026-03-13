import { useParams } from 'common'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { useAgentCreateMutation } from 'data/project-meta/agents-create-mutation'
import { useAgentsQuery } from 'data/project-meta/agents-query'
import React, { useState } from 'react'
import type { NextPageWithLayout } from 'types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input_Shadcn_ as Input,
  Label_Shadcn_ as Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'ui'

const AgentsPage: NextPageWithLayout = () => {
  const { ref: projectRef } = useParams()
  const { data: agents, isLoading, error } = useAgentsQuery({ projectRef })
  const { mutate: createAgent, isPending } = useAgentCreateMutation()

  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !projectRef) return
    createAgent(
      { projectRef, name: name.trim(), summary: summary.trim() || undefined },
      {
        onSuccess: () => {
          setName('')
          setSummary('')
        },
      }
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Agents</h1>
        <p className="text-sm text-foreground-light mt-1">
          Demo — lists and creates agents via the project-meta-api service.
        </p>
      </div>

      <Card>
        <CardHeader>Create agent</CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="My Agent"
                required
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="agent-summary">Summary</Label>
              <Input
                id="agent-summary"
                value={summary}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSummary(e.target.value)}
                placeholder="What does this agent do?"
              />
            </div>
            <Button htmlType="submit" loading={isPending} disabled={!name.trim()}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive">Error: {error.message}</p>
      ) : isLoading ? (
        <p className="text-sm text-foreground-light">Loading agents…</p>
      ) : !agents?.length ? (
        <p className="text-sm text-foreground-light">No agents yet. Create one above.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Tools</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell className="text-foreground-light">{agent.summary ?? '—'}</TableCell>
                <TableCell className="text-foreground-light">
                  {agent.tools.length ? agent.tools.join(', ') : '—'}
                </TableCell>
                <TableCell className="text-foreground-light text-xs">
                  {new Date(agent.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

AgentsPage.getLayout = (page: React.ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default AgentsPage
