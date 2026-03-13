import { useParams } from 'common'
import { AgentChat } from 'components/interfaces/AgentChat/AgentChat'
import AlertError from 'components/ui/AlertError'
import { useConversationsQuery } from 'data/project-meta/conversations-query'
import dayjs from 'dayjs'
import { MessageSquareIcon, PanelLeftClose, PanelLeftOpen, PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, cn } from 'ui'
import {
  InnerSideBarEmptyPanel,
  InnerSideBarFilters,
  InnerSideBarFilterSearchInput,
  InnerSideBarShimmeringLoaders,
  InnerSideMenuDataItem,
} from 'ui-patterns/InnerSideMenu'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'

function formatConversationRelativeTime(utcTimestamp: string) {
  const timestamp = dayjs(utcTimestamp)
  const now = dayjs()
  const minutes = now.diff(timestamp, 'minute')

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`

  const hours = now.diff(timestamp, 'hour')
  if (hours < 24) return `${hours}h`

  const days = now.diff(timestamp, 'day')
  if (days < 7) return `${days}d`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`

  const months = now.diff(timestamp, 'month')
  if (months < 12) return `${months}mo`

  return `${now.diff(timestamp, 'year')}y`
}

interface AgentOverviewProps {
  conversationId: string | null
  onConversationChange: (id: string | null) => void
}

export const AgentOverview = ({ conversationId, onConversationChange }: AgentOverviewProps) => {
  const { ref: projectRef, id: agentId } = useParams()
  const [search, setSearch] = useState('')
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const overviewHref = `/project/${projectRef}/observability/agents/${agentId}`

  const {
    data: conversations = [],
    error,
    isPending,
  } = useConversationsQuery({
    projectRef,
    agentId,
  })

  const filteredConversations = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const sorted = [...conversations].sort((a, b) => b.updated_at.localeCompare(a.updated_at))

    if (!needle) return sorted

    return sorted.filter((conversation) =>
      (conversation.title || 'Untitled conversation').toLowerCase().includes(needle)
    )
  }, [conversations, search])

  useEffect(() => {
    if (filteredConversations.length === 0) return

    if (
      conversationId !== null &&
      !filteredConversations.some((conversation) => conversation.id === conversationId)
    ) {
      onConversationChange(filteredConversations[0].id)
    }
  }, [conversationId, filteredConversations, onConversationChange])

  if (!projectRef || !agentId) return null

  return (
    <PageSection className="flex h-full min-h-0 flex-1 flex-col gap-0 !pt-0 last:pb-0 px-0 xl:px-0 bg-muted/15">
      <PageSectionContent className="flex min-h-0 flex-1 flex-col px-0 xl:px-0">
        <div
          className={cn(
            'grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200',
            isSidebarExpanded
              ? 'lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]'
              : 'lg:grid-cols-[0_minmax(0,1fr)] xl:grid-cols-[0_minmax(0,1fr)]'
          )}
        >
          <aside
            className={cn(
              'flex min-h-0 flex-col overflow-hidden',
              isSidebarExpanded ? 'border-r' : 'pointer-events-none border-r-0 opacity-0'
            )}
            aria-hidden={!isSidebarExpanded}
          >
            <div className="border-b bg-surface-75 px-4 py-3">
              <div className="flex items-center gap-2">
                <InnerSideBarFilters className="w-full p-0 gap-0">
                  <InnerSideBarFilterSearchInput
                    name="search-conversations"
                    placeholder="Search conversations..."
                    aria-labelledby="Search conversations"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </InnerSideBarFilters>
                <Button
                  type={conversationId === null ? 'default' : 'outline'}
                  onClick={() => onConversationChange(null)}
                  icon={<PlusIcon size={14} />}
                  className="w-[26px] shrink-0 px-1.5"
                />
              </div>
            </div>

            {error ? (
              <div className="p-4">
                <AlertError error={error} subject="Failed to retrieve conversations" />
              </div>
            ) : isPending ? (
              <div className="px-2 pt-2">
                <InnerSideBarShimmeringLoaders />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-2">
                <InnerSideBarEmptyPanel
                  title={search.trim() ? 'No matching conversations' : 'No conversations yet'}
                  description={
                    search.trim()
                      ? 'Try a different search term or start a new chat.'
                      : 'Start a conversation with this agent to see it here.'
                  }
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto py-2">
                {filteredConversations.map((conversation) => (
                  <InnerSideMenuDataItem
                    key={conversation.id}
                    href={overviewHref}
                    title={conversation.title || 'Untitled conversation'}
                    isActive={conversationId === conversation.id}
                    isOpened={false}
                    onClick={(event) => {
                      event.preventDefault()
                      onConversationChange(conversation.id)
                    }}
                    className="mb-1"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <MessageSquareIcon size={16} className="shrink-0 text-foreground-muted" />
                      <span className="truncate">
                        {conversation.title || 'Untitled conversation'}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-foreground-muted">
                      {formatConversationRelativeTime(conversation.updated_at)}
                    </span>
                  </InnerSideMenuDataItem>
                ))}
              </div>
            )}
          </aside>

          <section className="relative min-h-0 min-w-0 overflow-hidden">
            <Button
              type="outline"
              className="absolute left-3 top-3 z-10 h-7 w-7 px-0"
              icon={
                isSidebarExpanded ? (
                  <PanelLeftClose size={16} strokeWidth={1.5} />
                ) : (
                  <PanelLeftOpen size={16} strokeWidth={1.5} />
                )
              }
              onClick={() => setIsSidebarExpanded((value) => !value)}
              aria-label={isSidebarExpanded ? 'Collapse conversations' : 'Expand conversations'}
            />
            <AgentChat
              className="h-full"
              contentMaxWidthClassName="max-w-4xl"
              initialAgentId={agentId}
              initialConversationId={conversationId}
              onConversationChange={onConversationChange}
              projectRef={projectRef}
              restrictToInitialAgent
              showHeader={false}
            />
          </section>
        </div>
      </PageSectionContent>
    </PageSection>
  )
}
