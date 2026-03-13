import { useParams } from 'common'
import AlertError from 'components/ui/AlertError'
import { useAgentsQuery } from 'data/project-meta/agents-query'
import { useAlertMessageCreateMutation } from 'data/project-meta/alert-message-create-mutation'
import { useAlertMessagesQuery } from 'data/project-meta/alert-messages-query'
import { useAlertResolveMutation } from 'data/project-meta/alert-resolve-mutation'
import { useAlertsQuery } from 'data/project-meta/alerts-query'
import { useRulesQuery } from 'data/project-meta/rules-query'
import type { Alert, AlertSeverity } from 'data/project-meta/types'
import dayjs from 'dayjs'
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Hash,
  Loader2Icon,
  RotateCcw,
  Search,
  SendIcon,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  AiIconAnimation,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Input,
  TextArea_Shadcn_ as TextArea,
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

function splitByMentions(
  text: string,
  agentNames: string[]
): Array<{ type: 'text' | 'mention'; value: string }> {
  if (!agentNames.length || !text.includes('@')) return [{ type: 'text', value: text }]

  const sorted = [...agentNames].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`@(${escaped.join('|')})`, 'gi')

  const parts: Array<{ type: 'text' | 'mention'; value: string }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    parts.push({ type: 'mention', value: match[0] })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) })
  return parts.length > 0 ? parts : [{ type: 'text', value: text }]
}

function makeMentionComponents(agentNames: string[]) {
  const processChildren = (children: React.ReactNode): React.ReactNode =>
    React.Children.map(children, (child) => {
      if (typeof child !== 'string') return child
      const parts = splitByMentions(child, agentNames)
      if (parts.length === 1 && parts[0].type === 'text') return child
      return parts.map((part, i) =>
        part.type === 'mention' ? (
          <span key={i} className="bg-brand-300 text-foreground rounded px-0.5 font-medium">
            {part.value}
          </span>
        ) : (
          part.value
        )
      )
    })

  return {
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{processChildren(children)}</p>
    ),
  }
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
          <div className="grid min-h-0 flex-1 overflow-hidden border-t lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="text"
                        icon={<Filter />}
                        className="shrink-0"
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
  const [draft, setDraft] = useState('')
  const agentNames = useMemo(() => [...agentMap.values()], [agentMap])
  const mentionComponents = useMemo(() => makeMentionComponents(agentNames), [agentNames])
  const { mutate: resolveAlert, isPending: isUpdating } = useAlertResolveMutation()
  const { mutate: createMessage, isPending: isSending } = useAlertMessageCreateMutation()
  const { data: messages, isPending: isLoadingMessages } = useAlertMessagesQuery({
    projectRef,
    alertId: thread.parent.id,
  })

  const source =
    (thread.parent.rule_id && ruleMap.get(thread.parent.rule_id)) ||
    (thread.parent.agent_id && agentMap.get(thread.parent.agent_id))
  const metadata = JSON.stringify(thread.parent.metadata ?? {}, null, 2)
  const hasMetadata = Object.keys(thread.parent.metadata ?? {}).length > 0
  const firstSeen = dayjs(thread.parent.created_at).fromNow()
  const lastSeen = dayjs(getThreadLastActivity(thread)).fromNow()
  const instanceCount = thread.children.length + 1

  useEffect(() => {
    setDraft('')
  }, [thread.parent.id])

  const handleSendComment = () => {
    if (!projectRef || !draft.trim()) return

    createMessage(
      {
        projectRef,
        alertId: thread.parent.id,
        id: `amsg-${crypto.randomUUID().replace(/-/g, '')}`,
        content: draft.trim(),
      },
      {
        onSuccess: () => setDraft(''),
      }
    )
  }

  // Map severities to background color classes
  const severityBgClass = (() => {
    if (thread.parent.resolved_at) return 'border-brand'
    switch (thread.parent.severity) {
      case 'critical':
        return 'border-destructive'
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

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden border-t-4', severityBgClass)}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-8 pt-24">
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
              icon={
                thread.parent.resolved_at ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />
              }
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

        <div className="mx-auto w-full max-w-4xl px-8 pb-8">
          <div className="border-t pt-8">
            <h4 className="heading-meta text-foreground-lighter">Discussion</h4>

            {isLoadingMessages ? (
              <p className="text-sm text-foreground-lighter mt-2">Loading comments…</p>
            ) : messages && messages.length > 0 ? (
              <div className="flex flex-col gap-6 mt-6">
                {messages.map((message) => {
                  const isUserMessage = message.role === 'user'
                  const authorName =
                    message.role === 'assistant'
                      ? (message.agent_id ? agentMap.get(message.agent_id) : undefined) ??
                        'Assistant'
                      : 'You'

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'group flex w-full flex-col',
                        isUserMessage ? 'items-end' : 'items-start'
                      )}
                    >
                      {isUserMessage ? (
                        <div className="flex w-full flex-col items-end">
                          <div className="flex items-center gap-2 mb-2">
                            <TimestampInfo
                              className="text-xs text-foreground-lighter"
                              utcTimestamp={message.created_at}
                            />
                            <div className="text-sm text-foreground-light">{authorName}</div>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-surface-75 text-foreground text-xs font-mono">
                                U
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="w-fit max-w-[80%] rounded-2xl bg-surface-100 px-3 py-2">
                            <ReactMarkdown
                              className="prose max-w-none leading-normal text-foreground-light"
                              components={mentionComponents}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-brand-300 text-foreground border-brand text-xs font-mono">
                                <AiIconAnimation size={12} />
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-sm text-foreground-light">{authorName}</div>
                            <TimestampInfo
                              className="text-xs text-foreground-lighter"
                              utcTimestamp={message.created_at}
                            />
                          </div>
                          <div className="w-full max-w-full">
                            <ReactMarkdown
                              className="prose max-w-none leading-normal text-foreground group-hover:text-foreground"
                              components={mentionComponents}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-foreground-lighter mt-2">No comments yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl shrink-0 px-4 pb-4 z-10">
        <div className="rounded-2xl border bg-muted px-3 py-3">
          <TextArea
            className="min-h-[88px] resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
            disabled={!projectRef}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSendComment()
              }
            }}
            placeholder="Add context or next steps"
            value={draft}
          />
          <div className="mt-3 flex items-center justify-end">
            <Button
              className="h-9 w-9 rounded-full p-0"
              disabled={!draft.trim() || isSending || !projectRef}
              onClick={handleSendComment}
              size="small"
              htmlType="button"
            >
              {isSending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
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
