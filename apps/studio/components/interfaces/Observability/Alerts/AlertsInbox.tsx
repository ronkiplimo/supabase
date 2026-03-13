import { useChat } from '@ai-sdk/react'
import type { AgentChatSqlRunners, AgentChatSqlRunRequest, AgentChatSqlRunResult } from 'agent-chat'
import { AgentChat as AgentChatView } from 'agent-chat'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { getAccessToken, useParams } from 'common'
import { STUDIO_AGENT_CHAT_CONTENT_MAX_WIDTH_CLASS_NAME } from 'components/interfaces/AgentChat/AgentChat'
import { runAgentLogsSqlQuery } from 'components/interfaces/AgentChat/logsSql'
import AlertError from 'components/ui/AlertError'
import { useAgentsQuery } from 'data/project-meta/agents-query'
import { useAlertMessagesQuery } from 'data/project-meta/alert-messages-query'
import { useAlertResolveMutation } from 'data/project-meta/alert-resolve-mutation'
import { useAlertsQuery } from 'data/project-meta/alerts-query'
import { useRulesQuery } from 'data/project-meta/rules-query'
import type { Alert, AlertSeverity } from 'data/project-meta/types'
import { executeSql } from 'data/sql/execute-sql-query'
import dayjs from 'dayjs'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Hash,
  ListChecks,
  Loader2Icon,
  RotateCcw,
  Search,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Input,
} from 'ui'
import { EmptyStatePresentational, TimestampInfo, timestampLocalFormatter } from 'ui-patterns'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'

type Thread = {
  parent: Alert
  children: Alert[]
}

const severityVariant: Record<AlertSeverity, 'default' | 'warning' | 'destructive'> = {
  info: 'default',
  warning: 'warning',
  error: 'destructive',
  critical: 'destructive',
}

function getThreadLastActivity(thread: Thread) {
  return thread.children.at(-1)?.created_at ?? thread.parent.created_at
}

function getShortTimestamp(utcTimestamp: string) {
  const now = new Date()
  const timestamp = new Date(utcTimestamp)

  if (
    now.getFullYear() === timestamp.getFullYear() &&
    now.getMonth() === timestamp.getMonth() &&
    now.getDate() === timestamp.getDate()
  ) {
    return timestampLocalFormatter({ utcTimestamp, format: 'HH:mm' })
  }

  if (now.getFullYear() === timestamp.getFullYear()) {
    return timestampLocalFormatter({ utcTimestamp, format: 'DD MMM' })
  }

  return timestampLocalFormatter({ utcTimestamp, format: 'DD MMM YY' })
}

function buildThreads(alerts: Alert[]): Thread[] {
  const byId = new Map(alerts.map((alert) => [alert.id, alert]))
  const childrenByParent = new Map<string, Alert[]>()
  const roots: Alert[] = []

  alerts.forEach((alert) => {
    if (alert.parent_alert_id && byId.has(alert.parent_alert_id)) {
      const children = childrenByParent.get(alert.parent_alert_id) ?? []
      children.push(alert)
      childrenByParent.set(alert.parent_alert_id, children)
      return
    }

    roots.push(alert)
  })

  return roots
    .map((root) => ({
      parent: root,
      children: (childrenByParent.get(root.id) ?? []).sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      ),
    }))
    .sort((a, b) => getThreadLastActivity(b).localeCompare(getThreadLastActivity(a)))
}

const filterOptions = [
  { id: 'open', label: 'Open', resolved: false as const },
  { id: 'resolved', label: 'Resolved', resolved: true as const },
  { id: 'all', label: 'All', resolved: 'all' as const },
]

function getListEmptyCopy({
  hasSearch,
  filterId,
}: {
  hasSearch: boolean
  filterId: (typeof filterOptions)[number]['id']
}) {
  if (hasSearch) {
    return {
      title: 'No matching alerts',
      description: 'Try a different search term or clear the current filters.',
    }
  }

  if (filterId === 'open') {
    return {
      title: 'No open alerts',
      description: 'All current alert threads are resolved or no incidents have fired yet.',
    }
  }

  if (filterId === 'resolved') {
    return {
      title: 'No resolved alerts',
      description: 'Resolved incidents will appear here once alert threads are closed out.',
    }
  }

  return {
    title: 'No alerts yet',
    description: 'Rules and agent activity will surface here once alerts start firing.',
  }
}

export const AlertsInbox = () => {
  const { ref: projectRef } = useParams()
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>(filterOptions[0])
  const [search, setSearch] = useState('')
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)

  const {
    data: alerts,
    error,
    isPending,
  } = useAlertsQuery({
    projectRef,
    resolved: filter.resolved,
  })
  const { data: agents } = useAgentsQuery({ projectRef })
  const { data: rules } = useRulesQuery({ projectRef })

  const agentMap = useMemo(
    () => new Map((agents ?? []).map((agent) => [agent.id, agent.name])),
    [agents]
  )
  const ruleMap = useMemo(
    () => new Map((rules ?? []).map((rule) => [rule.id, rule.title])),
    [rules]
  )

  const filteredThreads = useMemo(() => {
    const threads = buildThreads(alerts ?? [])
    const needle = search.trim().toLowerCase()
    if (!needle) return threads

    return threads.filter(({ parent, children }) =>
      [parent, ...children].some((alert) =>
        [alert.title, alert.message]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle))
      )
    )
  }, [alerts, search])

  const selectedThread = useMemo(
    () =>
      filteredThreads.find((thread) => thread.parent.id === selectedAlertId) ??
      filteredThreads[0] ??
      null,
    [filteredThreads, selectedAlertId]
  )

  useEffect(() => {
    if (filteredThreads.length === 0) {
      setSelectedAlertId(null)
      return
    }

    if (
      !selectedAlertId ||
      !filteredThreads.some((thread) => thread.parent.id === selectedAlertId)
    ) {
      setSelectedAlertId(filteredThreads[0].parent.id)
    }
  }, [filteredThreads, selectedAlertId])

  const emptyCopy = getListEmptyCopy({
    hasSearch: search.trim().length > 0,
    filterId: filter.id,
  })

  return (
    <PageSection className="flex h-full min-h-0 flex-1 flex-col gap-0 !pt-0 last:pb-0 px-0 xl:px-0">
      <PageSectionContent className="flex min-h-0 flex-1 flex-col px-0 xl:px-0">
        {error ? (
          <div className="py-6">
            <AlertError error={error} subject="Failed to retrieve alerts" />
          </div>
        ) : isPending ? (
          <AlertsInboxSkeleton />
        ) : (
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col overflow-hidden border-r">
              <div className="border-b bg-surface-75">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search alerts"
                    icon={<Search />}
                    size="tiny"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="text"
                          icon={<Filter />}
                          className="shrink-0 w-7 h-7"
                          title={`Filter alerts: ${filter.label}`}
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuRadioGroup
                          value={filter.id}
                          onValueChange={(value) => {
                            const nextFilter = filterOptions.find((option) => option.id === value)
                            if (nextFilter) setFilter(nextFilter)
                          }}
                        >
                          {filterOptions.map((option) => (
                            <DropdownMenuRadioItem key={option.id} value={option.id}>
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="text"
                      icon={<ListChecks />}
                      className="shrink-0 w-7 h-7"
                      title="View alert rules"
                      disabled={!projectRef}
                      onClick={() =>
                        router.push(`/project/${projectRef}/observability/alerts/rules`)
                      }
                    />
                  </div>
                </div>
              </div>

              {filteredThreads.length === 0 ? (
                <EmptyStatePresentational
                  className="flex-1"
                  title={emptyCopy.title}
                  description={emptyCopy.description}
                />
              ) : (
                <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                  {filteredThreads.map((thread) => (
                    <AlertThreadListItem
                      key={thread.parent.id}
                      thread={thread}
                      isSelected={thread.parent.id === selectedAlertId}
                      onSelect={() => setSelectedAlertId(thread.parent.id)}
                    />
                  ))}
                </div>
              )}
            </aside>

            <section className="min-w-0 min-h-0 overflow-hidden">
              {selectedThread ? (
                <AlertThreadDetail
                  key={selectedThread.parent.id}
                  thread={selectedThread}
                  projectRef={projectRef}
                  agentMap={agentMap}
                  ruleMap={ruleMap}
                />
              ) : (
                <EmptyStatePresentational
                  title="Select an alert"
                  description="Choose a thread to inspect the alert and manage its follow-up."
                />
              )}
            </section>
          </div>
        )}
      </PageSectionContent>
    </PageSection>
  )
}

const AlertThreadListItem = ({
  thread,
  isSelected,
  onSelect,
}: {
  thread: Thread
  isSelected: boolean
  onSelect: () => void
}) => {
  const description = thread.parent.message?.trim() || 'No description'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full space-y-1.5 px-4 py-3 text-left transition hover:bg-surface-200',
        isSelected && 'bg-surface-200'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-medium text-foreground">{thread.parent.title}</p>
        <Badge variant={severityVariant[thread.parent.severity]}>{thread.parent.severity}</Badge>
      </div>

      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm text-foreground-light">{description}</p>
        <TimestampInfo
          className="shrink-0 text-sm text text-foreground-muted"
          utcTimestamp={getThreadLastActivity(thread)}
          label={getShortTimestamp(getThreadLastActivity(thread))}
        />
      </div>
    </button>
  )
}

function normalizeSqlRows(
  result: unknown
): Array<Record<string, string | number | boolean | null | object>> {
  if (!Array.isArray(result)) return []
  return result.filter(
    (row): row is Record<string, string | number | boolean | null | object> =>
      typeof row === 'object' && row !== null && !Array.isArray(row)
  )
}

function normalizeLogsResult(
  result: unknown,
  includeMetadata: boolean
): Array<Record<string, string | number | boolean | null | object>> {
  if (!Array.isArray(result)) return []
  return result
    .filter(
      (row): row is Record<string, string | number | boolean | null | object> =>
        typeof row === 'object' && row !== null && !Array.isArray(row)
    )
    .map((row) => {
      if (includeMetadata) return row
      const { metadata: _metadata, ...rest } = row
      return rest
    })
}

const AlertThreadDetail = ({
  thread,
  projectRef,
  agentMap,
  ruleMap,
}: {
  thread: Thread
  projectRef?: string
  agentMap: Map<string, string>
  ruleMap: Map<string, string>
}) => {
  const [input, setInput] = useState('')
  const { logsMetadata } = useIsFeatureEnabled(['logs:metadata'])
  const { mutate: resolveAlert, isPending: isUpdating } = useAlertResolveMutation()

  const { data: storedMessages = [], isPending: isLoadingMessages } = useAlertMessagesQuery({
    projectRef,
    alertId: thread.parent.id,
  })

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      storedMessages.map((m) => ({
        id: m.id,
        role: m.role as UIMessage['role'],
        parts: (m.parts ?? []) as UIMessage['parts'],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only re-derive when the alert changes, not on every poll
    [thread.parent.id]
  )

  const { messages, sendMessage, status } = useChat({
    id: thread.parent.id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/platform/project-meta/${projectRef}/chat`,
      headers: async () => {
        const token = await getAccessToken()
        return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)
      },
      prepareSendMessagesRequest({ messages: msgs, body }) {
        return { body: { ...(body ?? {}), message: msgs[msgs.length - 1] } }
      },
    }),
  })

  const handleDatabaseSqlRun = useCallback(
    async (request: AgentChatSqlRunRequest): Promise<AgentChatSqlRunResult> => {
      if (!projectRef) return { error: 'No project selected' }
      try {
        const response = await executeSql({
          projectRef,
          connectionString: request.source === 'sql' ? request.connectionString : null,
          sql: request.sql,
        })
        return { rows: normalizeSqlRows(response.result) }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'An unknown error occurred' }
      }
    },
    [projectRef]
  )

  const handleLogsSqlRun = useCallback(
    async (request: AgentChatSqlRunRequest): Promise<AgentChatSqlRunResult> => {
      if (request.source !== 'logs') return { error: 'Logs runner received a non-logs request.' }
      if (!projectRef) return { error: 'No project selected' }
      try {
        const { data, error } = await runAgentLogsSqlQuery({
          projectRef,
          sql: request.sql,
          dateRange: request.dateRange,
        })
        if (error) return { error: String(error) }
        if (data?.error) return { error: String(data.error) }
        return { rows: normalizeSqlRows(normalizeLogsResult(data?.result ?? [], logsMetadata)) }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'An unknown error occurred' }
      }
    },
    [logsMetadata, projectRef]
  )

  const sqlRunners = useMemo<AgentChatSqlRunners>(
    () => ({ database: handleDatabaseSqlRun, logs: handleLogsSqlRun }),
    [handleDatabaseSqlRun, handleLogsSqlRun]
  )

  const handleSendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !projectRef) return

      sendMessage({ text: trimmed }, { body: { alert_id: thread.parent.id } })
      setInput('')
    },
    [projectRef, sendMessage, thread.parent.id]
  )

  const source =
    (thread.parent.rule_id && ruleMap.get(thread.parent.rule_id)) ||
    (thread.parent.agent_id && agentMap.get(thread.parent.agent_id))
  const firstSeen = dayjs(thread.parent.created_at).fromNow()
  const lastSeen = dayjs(getThreadLastActivity(thread)).fromNow()
  const instanceCount = thread.children.length + 1

  const severityBgClass = (() => {
    if (thread.parent.resolved_at) return 'border-brand'
    switch (thread.parent.severity) {
      case 'critical':
      case 'error':
        return 'border-destructive'
      case 'warning':
        return 'border-warning'
      case 'info':
        return 'border-muted'
      default:
        return ''
    }
  })()

  const alertHeader = (
    <div
      className={cn(
        'mx-auto mb-4 w-full border-b pb-8 pt-24',
        STUDIO_AGENT_CHAT_CONTENT_MAX_WIDTH_CLASS_NAME
      )}
    >
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h2 className="heading-title mb-2">{thread.parent.title}</h2>
          <div className="flex flex-wrap items-center gap-2 text-foreground-light mb-4">
            <span>First seen {firstSeen}</span>
            <ArrowRight size={14} className="text-foreground-muted" />
            <span className="inline-flex items-center gap-1.5">
              <Hash size={14} className="text-foreground-muted" />
              {instanceCount} {instanceCount === 1 ? 'instance' : 'instances'}
            </span>
            <ArrowRight size={14} className="text-foreground-muted" />
            <span>Last seen {lastSeen}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant[thread.parent.severity]}>
              {thread.parent.severity}
            </Badge>
            <Badge variant={thread.parent.resolved_at ? 'success' : 'default'}>
              {thread.parent.resolved_at ? 'Resolved' : 'Open'}
            </Badge>
            {source && <Badge variant="default">{source}</Badge>}
          </div>
        </div>
        <Button
          type="default"
          icon={thread.parent.resolved_at ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
          loading={isUpdating}
          onClick={() => {
            if (!projectRef) return
            resolveAlert({
              projectRef,
              id: thread.parent.id,
              resolved_at: thread.parent.resolved_at ? null : new Date().toISOString(),
            })
          }}
        >
          {thread.parent.resolved_at ? 'Reopen' : 'Resolve'}
        </Button>
      </div>
      {thread.parent.message && (
        <ReactMarkdown className="prose max-w-none leading-normal mt-8 text-foreground [&>pre]:rounded-lg [&>pre]:bg [&>pre]:border [&>pre]:p-4 [&>pre]:text-foreground-light">
          {thread.parent.message}
        </ReactMarkdown>
      )}
    </div>
  )

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden border-t-4', severityBgClass)}>
      {isLoadingMessages ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="size-5 animate-spin text-foreground-muted" />
        </div>
      ) : (
        <AgentChatView
          className="min-h-0 flex-1"
          contentMaxWidthClassName={STUDIO_AGENT_CHAT_CONTENT_MAX_WIDTH_CLASS_NAME}
          showHeader={false}
          showAgentSelector={false}
          messages={messages}
          status={status}
          input={input}
          onInputChange={setInput}
          onSubmit={({ text }) => handleSendMessage(text)}
          onActionPrompt={handleSendMessage}
          sqlRunners={sqlRunners}
          disabled={!projectRef}
          placeholder="Add context or mention @AgentName to get a response..."
          emptyState={{
            title: 'No discussion yet',
            description: 'Add context or mention @AgentName to ask an agent to investigate.',
          }}
          prependConversation={alertHeader}
        />
      )}
    </div>
  )
}

const AlertActivityItem = ({ alert, isParent = false }: { alert: Alert; isParent?: boolean }) => {
  return (
    <div className="rounded border p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant[alert.severity]}>{alert.severity}</Badge>
            {isParent && <Badge variant="default">Primary alert</Badge>}
            {alert.resolved_at && <Badge variant="success">Resolved</Badge>}
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">{alert.title}</p>
            {alert.message && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground-light">
                {alert.message}
              </p>
            )}
          </div>
        </div>

        <TimestampInfo className="shrink-0 text-xs" utcTimestamp={alert.created_at} />
      </div>
    </div>
  )
}

const AlertsInboxSkeleton = () => {
  return (
    <div className="grid h-full min-h-0 animate-pulse border-t lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className="space-y-3 border-b p-4 lg:border-b-0 lg:border-r">
        <div className="h-6 w-24 rounded bg-surface-200" />
        <div className="h-4 w-64 rounded bg-surface-200" />
        <div className="h-9 w-full rounded bg-surface-200" />
        <div className="space-y-2 pt-2">
          <div className="h-24 rounded bg-surface-200" />
          <div className="h-24 rounded bg-surface-200" />
          <div className="h-24 rounded bg-surface-200" />
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 rounded bg-surface-200" />
        <div className="h-24 rounded bg-surface-200" />
        <div className="h-48 rounded bg-surface-200" />
        <div className="h-40 rounded bg-surface-200" />
      </div>
    </div>
  )
}
