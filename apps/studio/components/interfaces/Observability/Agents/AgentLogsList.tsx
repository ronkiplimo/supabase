import { useParams } from 'common'
import AlertError from 'components/ui/AlertError'
import { useAgentLogsQuery } from 'data/project-meta/agent-logs-query'
import { RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui'
import { EmptyStatePresentational, TimestampInfo } from 'ui-patterns'
import { Input } from 'ui-patterns/DataInputs/Input'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

const SOURCE_LABELS = {
  conversation: 'Conversation',
  alert: 'Alert',
} as const

export const AgentLogsList = () => {
  const { ref: projectRef, id } = useParams()
  const [search, setSearch] = useState('')
  const {
    data: logs,
    error,
    isPending,
    isFetching,
    refetch,
  } = useAgentLogsQuery({ projectRef, id })

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return logs ?? []

    return (logs ?? []).filter((log) =>
      [SOURCE_LABELS[log.source], log.role, log.task_name, log.thread_label, log.content]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    )
  }, [logs, search])

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="border-b p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search messages"
            icon={<Search />}
            size="tiny"
            className="w-full sm:w-80"
          />

          <Button
            type="default"
            icon={<RefreshCw size={14} />}
            loading={isFetching}
            disabled={isFetching}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="p-3">
            <AlertError error={error} subject="Failed to retrieve agent logs" />
          </div>
        ) : isPending ? (
          <div className="p-3">
            <GenericSkeletonLoader />
          </div>
        ) : filteredLogs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Task / Thread</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="font-mono text-xs">
              {filteredLogs.map((log) => (
                <TableRow key={`${log.source}-${log.id}`}>
                  <TableCell className="py-3 px-4">
                    <TimestampInfo className="text-xs" utcTimestamp={log.created_at} />
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge variant="default">{SOURCE_LABELS[log.source]}</Badge>
                  </TableCell>
                  <TableCell className="capitalize py-3 px-4">{log.role}</TableCell>
                  <TableCell className="max-w-[240px] py-3 px-4">
                    <div className="space-y-1">
                      <p className="truncate text-xs text-foreground">
                        {log.task_name || log.thread_label || 'Untitled'}
                      </p>
                      {log.task_name && log.thread_label && (
                        <p className="truncate text-xs text-foreground-light">{log.thread_label}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[420px] py-3 px-4">
                    <p className="truncate text-xs text-foreground-light">
                      {log.content || 'No text content'}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-6">
            <EmptyStatePresentational
              title={logs?.length ? 'No matching messages' : 'No messages yet'}
              description={
                logs?.length
                  ? 'Try a different search term.'
                  : 'Messages across conversations and alerts for this agent will appear here.'
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
