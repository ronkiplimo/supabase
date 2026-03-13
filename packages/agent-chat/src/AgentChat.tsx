'use client'

import type { UIMessage } from 'ai'
import {
  BotIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  Loader2Icon,
  PlusIcon,
  SendIcon,
} from 'lucide-react'
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type HTMLAttributes,
} from 'react'
import {
  Button_Shadcn_ as Button,
  cn,
  Command_Shadcn_ as Command,
  CommandEmpty_Shadcn_ as CommandEmpty,
  CommandGroup_Shadcn_ as CommandGroup,
  CommandInput_Shadcn_ as CommandInput,
  CommandItem_Shadcn_ as CommandItem,
  CommandList_Shadcn_ as CommandList,
  CommandSeparator_Shadcn_ as CommandSeparator,
  Popover_Shadcn_ as Popover,
  PopoverContent_Shadcn_ as PopoverContent,
  PopoverTrigger_Shadcn_ as PopoverTrigger,
  TextArea_Shadcn_ as TextArea,
} from 'ui'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'

import { ToolChart, ToolPullRequest, ToolRow, ToolSql } from './parts'
import type {
  AgentChatChart,
  AgentChatProps,
  AgentChatPullRequest,
  AgentChatRowItem,
  AgentChatSql,
} from './types'

const DEFAULT_EMPTY_STATE = {
  title: 'Welcome back,',
  description: 'Send a message to start chatting',
}

type RowToolPayload = {
  rows: AgentChatRowItem[]
}

type MessagePartWithPayload = UIMessage['parts'][number] & {
  input?: unknown
  output?: unknown
  toolName?: string
}

type ChatMessageWithTimestamp = UIMessage & {
  createdAt?: Date
}

const Conversation = ({ className, ...props }: ComponentProps<typeof StickToBottom>) => (
  <StickToBottom
    className={cn('relative flex-1 overflow-y-hidden', className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
)

const ConversationContent = ({
  className,
  style,
  ...props
}: ComponentProps<typeof StickToBottom.Content>) => {
  const { scrollRef, contentRef } = useStickToBottomContext()

  return (
    <div ref={scrollRef} className="h-full w-full" style={style}>
      <div ref={contentRef} className={cn('flex flex-col gap-6 p-4', className)} {...props} />
    </div>
  )
}

const ConversationScrollButton = () => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) return null

  return (
    <Button
      className="absolute bottom-4 left-1/2 z-20 h-9 w-9 -translate-x-1/2 rounded-full"
      onClick={() => scrollToBottom()}
      size="icon"
      type="button"
      variant="outline"
    >
      <ChevronsUpDownIcon className="size-4 rotate-180" />
    </Button>
  )
}

const formatMessageTimestamp = (value?: Date) => {
  if (!value) return null

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value)
}

const Message = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('group flex w-full flex-col', className)} {...props} />
)

const MessageContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'min-w-0 overflow-hidden text-base break-words',
      'group-[.is-user]:w-fit group-[.is-user]:max-w-[80%] group-[.is-user]:self-end group-[.is-user]:rounded-2xl group-[.is-user]:bg-surface-100 group-[.is-user]:px-3 group-[.is-user]:py-2',
      'group-[.is-assistant]:w-full group-[.is-assistant]:max-w-full',
      className
    )}
    {...props}
  />
)

type StreamdownComponent = (props: { children: string; className?: string }) => JSX.Element

const StreamdownMessage = ({ children, className }: { children: string; className?: string }) => {
  const [Renderer, setRenderer] = useState<StreamdownComponent | null>(null)

  useEffect(() => {
    let active = true

    void import('streamdown').then((module) => {
      if (!active) return

      setRenderer(() => module.Streamdown as StreamdownComponent)
    })

    return () => {
      active = false
    }
  }, [])

  if (!Renderer) {
    return <div className={cn('whitespace-pre-wrap', className)}>{children}</div>
  }

  return <Renderer className={className}>{children}</Renderer>
}

const MessageResponse = memo(
  ({ children, className }: { children: string; className?: string }) => (
    <StreamdownMessage
      className={cn(
        'size-full whitespace-pre-wrap leading-normal text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        '[&>pre]:rounded-lg [&>pre]:border [&>pre]:bg [&>pre]:p-4 [&>pre]:text-foreground',
        className
      )}
    >
      {children}
    </StreamdownMessage>
  )
)

MessageResponse.displayName = 'MessageResponse'

const getToolPartName = (part: MessagePartWithPayload) => {
  if (part.type === 'dynamic-tool' && typeof part.toolName === 'string') {
    return part.toolName
  }

  if (part.type.startsWith('tool-')) {
    return part.type.replace('tool-', '')
  }

  return null
}

const ToolCallLabel = ({ name }: { name: string }) => (
  <div className="text-base text-foreground-lighter">
    <span className="text-foreground-muted"># </span>
    {`Run ${name}`}
  </div>
)

const getToolLabelWidthClass = (role: UIMessage['role']) =>
  role === 'user' ? 'mx-auto w-full max-w-4xl' : 'mx-auto w-full max-w-4xl'

const getPartWidthClass = (
  part: UIMessage['parts'][number],
  role: UIMessage['role'],
  contentMaxWidthClassName?: string
) => {
  const defaultContentWidthClass = contentMaxWidthClassName ?? 'max-w-[80ch]'
  const wideToolWidthClass = 'max-w-6xl'
  const centeredDefaultWidthClass = cn('mx-auto w-full', defaultContentWidthClass)
  const centeredWideToolWidthClass = cn('mx-auto w-full', wideToolWidthClass)

  if (role === 'user') return centeredDefaultWidthClass

  if (part.type === 'text') return centeredDefaultWidthClass

  const payloadPart = part as MessagePartWithPayload

  if (payloadPart.type === 'tool-renderSql' || payloadPart.type === 'tool-renderChart') {
    return centeredWideToolWidthClass
  }

  if (payloadPart.type === 'tool-renderRow') return centeredDefaultWidthClass
  if (payloadPart.type === 'tool-renderPullRequest') return centeredDefaultWidthClass

  return centeredDefaultWidthClass
}

export const AgentChat = ({
  className,
  showHeader = true,
  headerActions,
  contentMaxWidthClassName,
  emptyStateContent,
  emptyStateImage,
  messages,
  status = 'ready',
  input,
  onInputChange,
  onSubmit,
  placeholder = 'Ask anything...',
  disabled = false,
  suggestions = [],
  onSuggestionSelect,
  conversations = [],
  activeConversationId = null,
  onConversationChange,
  onRefreshConversations,
  agents = [],
  selectedAgentId,
  onAgentChange,
  showAgentSelector = true,
  models = [],
  selectedModelId,
  onModelChange,
  emptyState = DEFAULT_EMPTY_STATE,
  renderMessagePart,
  onActionPrompt,
  sqlRunners,
  renderSqlEditor,
  prependConversation,
}: AgentChatProps) => {
  const [conversationOpen, setConversationOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)

  const isStreaming = status === 'submitted' || status === 'streaming'
  const hasMessages = messages.length > 0
  const hasCustomEmptyState = Boolean(emptyStateImage || emptyStateContent)
  const showEmptyStateImage = !hasMessages && Boolean(emptyStateImage)

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  )
  const conversationLabel = activeConversationId
    ? selectedConversation?.title ?? 'Untitled'
    : 'New conversation'

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId)
  const selectedModel = models.find((model) => model.id === selectedModelId)
  const groupedModels = useMemo(() => {
    const groups = new Map<string, typeof models>()

    models.forEach((model) => {
      const groupName = model.group ?? model.provider ?? 'Models'
      const group = groups.get(groupName) ?? []
      group.push(model)
      groups.set(groupName, group)
    })

    return Array.from(groups.entries())
  }, [models])

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || disabled || isStreaming) return

    onSubmit({
      text: trimmed,
      agentId: selectedAgentId,
      conversationId: activeConversationId,
      modelId: selectedModelId,
    })
  }, [
    activeConversationId,
    disabled,
    input,
    isStreaming,
    onSubmit,
    selectedAgentId,
    selectedModelId,
  ])

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onSuggestionSelect?.(suggestion)
    },
    [onSuggestionSelect]
  )

  const renderBuiltInPart = useCallback(
    (
      part: UIMessage['parts'][number],
      message: UIMessage,
      messageIndex: number,
      partIndex: number
    ) => {
      const partWidthClass = getPartWidthClass(part, message.role, contentMaxWidthClassName)

      if (part.type === 'text') {
        return (
          <div key={`${message.id}-${partIndex}`} className={partWidthClass}>
            <MessageResponse>{part.text}</MessageResponse>
          </div>
        )
      }

      const payloadPart = part as MessagePartWithPayload
      const toolName = getToolPartName(payloadPart)
      let content = null

      if (payloadPart.type === 'tool-renderRow') {
        const payload = (payloadPart.input ?? payloadPart.output) as RowToolPayload | undefined
        if (!payload?.rows?.length) {
          return toolName ? (
            <div
              key={`${message.id}-${partIndex}`}
              className={getToolLabelWidthClass(message.role)}
            >
              <ToolCallLabel name={toolName} />
            </div>
          ) : null
        }

        content = <ToolRow rows={payload.rows} onActionSelect={onActionPrompt} />
      }

      if (payloadPart.type === 'tool-renderChart') {
        const payload = (payloadPart.output ?? payloadPart.input) as AgentChatChart | undefined
        if (!payload) {
          return toolName ? (
            <div
              key={`${message.id}-${partIndex}`}
              className={getToolLabelWidthClass(message.role)}
            >
              <ToolCallLabel name={toolName} />
            </div>
          ) : null
        }

        content = <ToolChart {...payload} />
      }

      if (payloadPart.type === 'tool-renderSql') {
        const payload = (payloadPart.output ?? payloadPart.input) as AgentChatSql | undefined
        if (!payload) {
          return toolName ? (
            <div
              key={`${message.id}-${partIndex}`}
              className={getToolLabelWidthClass(message.role)}
            >
              <ToolCallLabel name={toolName} />
            </div>
          ) : null
        }

        content = <ToolSql renderEditor={renderSqlEditor} sqlRunners={sqlRunners} sql={payload} />
      }

      if (payloadPart.type === 'tool-renderPullRequest') {
        const payload = (payloadPart.output ?? payloadPart.input) as
          | AgentChatPullRequest
          | undefined
        if (!payload) {
          return toolName ? (
            <div
              key={`${message.id}-${partIndex}`}
              className={getToolLabelWidthClass(message.role)}
            >
              <ToolCallLabel name={toolName} />
            </div>
          ) : null
        }

        content = <ToolPullRequest {...payload} />
      }

      if (!content) {
        content = renderMessagePart?.(part, { message, messageIndex, partIndex }) ?? null
      }

      if (!toolName) {
        return content ? (
          <div key={`${message.id}-${partIndex}`} className={partWidthClass}>
            {content}
          </div>
        ) : null
      }

      return (
        <Fragment key={`${message.id}-${partIndex}`}>
          <div className={getToolLabelWidthClass(message.role)}>
            <ToolCallLabel name={toolName} />
          </div>
          {content ? <div className={partWidthClass}>{content}</div> : null}
        </Fragment>
      )
    },
    [contentMaxWidthClassName, onActionPrompt, renderMessagePart, renderSqlEditor, sqlRunners]
  )

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      {showHeader ? (
        <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
          <div className="flex items-center gap-1">
            <Popover
              open={conversationOpen}
              onOpenChange={(open) => {
                setConversationOpen(open)
                if (open) onRefreshConversations?.()
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  aria-label="Select conversation"
                  className="h-7 justify-between gap-2 px-2 font-normal"
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <span className="max-w-[220px] truncate text-sm">{conversationLabel}</span>
                  <ChevronsUpDownIcon className="size-3.5 shrink-0 text-foreground-light" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder="Search conversations..." />
                  <CommandList>
                    <CommandEmpty>No conversations found.</CommandEmpty>
                    <CommandGroup heading="Recent">
                      {conversations.map((conversation) => (
                        <CommandItem
                          key={conversation.id}
                          value={`${conversation.title ?? ''} ${conversation.id}`}
                          onSelect={() => {
                            onConversationChange?.(conversation.id)
                            setConversationOpen(false)
                          }}
                        >
                          <span className="truncate">{conversation.title ?? 'Untitled'}</span>
                          {activeConversationId === conversation.id ? (
                            <CheckIcon className="ml-auto size-4" />
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              aria-label="Start new conversation"
              className="h-7 w-7 rounded-md p-0"
              onClick={() => onConversationChange?.(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
          {headerActions}
        </div>
      ) : null}

      <Conversation className="min-h-0 flex-1">
        <ConversationContent
          className={cn('pb-32 px-8', !hasMessages && hasCustomEmptyState && 'p-0')}
          style={
            hasMessages
              ? {
                  WebkitMaskImage:
                    'linear-gradient(to bottom, black 0, black calc(100% - 8rem), transparent 100%)',
                  maskImage:
                    'linear-gradient(to bottom, black 0, black calc(100% - 8rem), transparent 100%)',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                }
              : undefined
          }
        >
          {prependConversation}
          <div
            className={cn(
              'w-full',
              showEmptyStateImage && 'relative min-h-full',
              !prependConversation && 'pt-8'
            )}
          >
            {!hasMessages ? (
              emptyStateImage ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden">
                  <img
                    src={emptyStateImage}
                    alt=""
                    aria-hidden="true"
                    className="block w-full opacity-25"
                    style={{
                      WebkitMaskImage:
                        'linear-gradient(to bottom, black 0, black 72%, transparent 100%)',
                      maskImage: 'linear-gradient(to bottom, black 0, black 72%, transparent 100%)',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: '100% 100%',
                      maskSize: '100% 100%',
                    }}
                  />
                </div>
              ) : emptyStateContent ? (
                <div className="w-full">{emptyStateContent}</div>
              ) : (
                <div className="flex flex-1 items-center justify-center py-20">
                  <div className="max-w-sm text-center">
                    <svg
                      width="223"
                      height="262"
                      viewBox="0 0 223 262"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-32 mx-auto"
                    >
                      <path
                        d="M75.7618 237.192L75.3469 196.038C75.3123 192.904 72.3505 190.633 69.3196 191.417L40.5431 198.804C39.3216 199.115 38.0308 198.943 36.936 198.309L3.12338 178.832C1.64825 177.98 0.7263 176.412 0.703251 174.707L0.000262295 113.408C-0.0227865 111.184 1.47539 109.225 3.63045 108.672L21.0554 104.235C23.2104 103.682 24.7086 101.734 24.6856 99.5099L24.4666 79.7917C24.4435 77.5675 25.9417 75.6083 28.1083 75.0551L45.5217 70.6298C47.6768 70.0766 49.1865 68.129 49.1634 65.8932L48.9444 46.1635C48.9214 43.9392 50.4196 41.9801 52.5862 41.4269L70.0226 37.0131C72.1777 36.4714 73.6874 34.5123 73.6643 32.2881L73.4684 12.5583C73.4453 10.3341 74.955 8.3749 77.1101 7.83325L107.581 0.14647C108.779 -0.153165 110.047 0.00817703 111.13 0.618971L145.139 19.7495C146.648 20.6023 147.582 22.1811 147.593 23.9098L147.974 65.7319C147.997 68.8665 150.959 71.1369 153.989 70.3647L182.213 63.1735C183.423 62.8623 184.69 63.0352 185.774 63.646L219.817 82.8572C221.315 83.71 222.26 85.2888 222.272 87.0175L222.836 148.201C222.859 150.425 221.361 152.372 219.218 152.926L201.839 157.397C199.695 157.95 198.197 159.898 198.22 162.111L198.382 181.76C198.405 183.972 196.906 185.92 194.763 186.473L177.499 190.922C175.356 191.475 173.858 193.422 173.881 195.635L174.053 215.25C174.077 217.462 172.578 219.41 170.435 219.963L153.102 224.435C150.959 224.988 149.46 226.935 149.483 229.148L149.656 248.774C149.679 250.987 148.181 252.934 146.038 253.488L115.648 261.359C114.426 261.681 113.124 261.497 112.029 260.863L78.1819 241.329C76.7068 240.477 75.7848 238.909 75.7733 237.192H75.7618Z"
                        fill="black"
                      />
                      <path
                        d="M113.314 60.5784L108.547 61.7873L88.5224 66.8763L58.837 50.0551L83.6055 43.7803L108.512 57.8612L113.314 60.5784Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M113.321 60.5779L108.52 57.8608L83.613 43.7798L83.3367 16.4929L108.243 30.5393L113.057 33.2565L113.321 60.5779Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M212.413 90.0193C202.66 92.5062 192.918 95.0046 183.165 97.4915C183.073 97.5146 182.969 97.5376 182.877 97.5606C168.103 101.337 153.318 105.102 138.545 108.878L138.314 84.5159L182.635 73.2212L183.165 73.5205L212.413 90.0193Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M114.358 169.692L84.961 177.245L40.1104 188.759L39.8456 164.224L84.7076 152.733L114.358 169.692Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M212.918 144.385L183.164 127.507V97.491C192.917 95.0041 202.658 92.5057 212.411 90.0188L212.918 144.385Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M183.161 127.506C174.951 129.613 166.74 131.72 158.53 133.827L158.772 160.964L134.234 167.262L134.487 194.365L114.647 199.477L114.359 169.692L84.7082 152.732L39.8462 164.223L39.5123 134.173L64.3038 127.84L64.016 100.519L88.796 94.2095L88.5197 66.8765L108.544 61.7876L113.311 60.5787L113.046 33.2573L137.78 26.9824L138.31 84.5151L138.54 108.878C153.314 105.101 168.099 101.336 182.873 97.5599C182.965 97.5369 183.069 97.5138 183.161 97.4908V127.506Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M139.785 244.875L115.143 251.254L114.947 230.575L139.785 244.875Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M114.952 230.575V230.564L114.687 203.449L139.548 217.726L139.79 244.875L114.952 230.575Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M164.17 211.371L139.551 217.726L114.69 203.449L114.656 199.477L134.496 194.365L164.17 211.371Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M164.16 211.371L134.486 194.365L134.233 167.263L163.918 184.222L164.16 211.371Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M188.48 177.901L163.918 184.222L134.233 167.262L158.771 160.965L188.48 177.901Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M188.479 177.901L158.771 160.965L158.529 133.827L188.249 150.729L188.479 177.901Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M212.914 144.386L188.249 150.73L158.529 133.828C166.739 131.721 174.949 129.614 183.159 127.507L212.914 144.386Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M40.1103 188.759L10.5401 171.73L9.91827 117.226L39.5116 134.173L39.8455 164.224L40.1103 188.759Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M64.3031 127.84L39.5116 134.173L9.91827 117.225L34.6753 110.916L64.3031 127.84Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M64.3074 127.84L34.6796 110.916L34.3802 83.6401L64.0195 100.519L64.3074 127.84Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M88.7996 94.2102L64.0195 100.52L34.3802 83.6408L59.1372 77.3545L88.7996 94.2102Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M88.7987 94.209L59.1364 77.3533L58.837 50.0549L88.5224 66.8761L88.7987 94.209Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M137.791 26.9825L113.057 33.2573L108.243 30.5401L83.3367 16.4937L108.048 10.2534L137.791 26.9825Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M115.149 251.253L85.5438 234.167L84.968 177.244L114.366 169.692L114.653 199.477L114.688 203.449L114.953 230.563V230.575L115.149 251.253Z"
                        fill="black"
                        stroke="#E8E8E8"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <p className="heading-section mb-1">{emptyState.title}</p>
                    {emptyState.description ? (
                      <p className="text-foreground-light">{emptyState.description}</p>
                    ) : null}
                  </div>
                </div>
              )
            ) : null}

            {messages.map((message, messageIndex) => {
              const isUser = message.role === 'user'
              const timestamp = formatMessageTimestamp(
                (message as ChatMessageWithTimestamp).createdAt
              )

              return (
                <Message
                  key={message.id}
                  className={cn(
                    isUser ? 'is-user items-end' : 'is-assistant items-start',
                    messageIndex > 0 && 'mt-8'
                  )}
                >
                  {isUser ? (
                    <div className="mx-auto flex w-full max-w-4xl flex-col items-end">
                      {timestamp ? (
                        <div className="mb-2 text-xs text-foreground-lighter">{timestamp}</div>
                      ) : null}

                      <MessageContent className="space-y-4">
                        {message.parts.map((part, partIndex) =>
                          renderBuiltInPart(part, message, messageIndex, partIndex)
                        )}
                      </MessageContent>
                    </div>
                  ) : (
                    <MessageContent className="space-y-4">
                      {message.parts.map((part, partIndex) =>
                        renderBuiltInPart(part, message, messageIndex, partIndex)
                      )}
                    </MessageContent>
                  )}
                </Message>
              )
            })}

            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' ? (
              <div className="flex gap-3 py-3">
                <div className="rounded-lg bg-muted px-4 py-3">
                  <Loader2Icon className="size-4 animate-spin text-foreground-light" />
                </div>
              </div>
            ) : null}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {!hasMessages && suggestions.length > 0 ? (
        <div className={cn('mx-auto w-full shrink-0 px-4 pt-4 pb-4', contentMaxWidthClassName)}>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="rounded-full border px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => handleSuggestionClick(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'z-10 mx-auto w-full shrink-0',
          showHeader ? 'p-4 pt-0' : 'pb-4',
          contentMaxWidthClassName
        )}
      >
        <div className="rounded-2xl border bg-muted px-3 py-3">
          <TextArea
            className="min-h-[88px] resize-none border-0 bg-transparent px-0 py-0 shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={disabled}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={placeholder}
            value={input}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {showAgentSelector && agents.length > 0 && onAgentChange ? (
                <Popover open={agentOpen} onOpenChange={setAgentOpen}>
                  <PopoverTrigger asChild>
                    <Button className="h-8 gap-2 px-3" size="sm" type="button" variant="ghost">
                      <BotIcon className="size-4" />
                      <span className="max-w-[120px] truncate">
                        {selectedAgent?.name ?? 'Select agent'}
                      </span>
                      <ChevronsUpDownIcon className="size-3.5 shrink-0 text-foreground-light" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[240px] p-0">
                    <Command>
                      <CommandInput placeholder="Search agents..." />
                      <CommandList>
                        <CommandEmpty>No agents found.</CommandEmpty>
                        <CommandGroup heading="Agents">
                          {agents.map((agent) => (
                            <CommandItem
                              key={agent.id}
                              value={`${agent.name} ${agent.id}`}
                              onSelect={() => {
                                onAgentChange(agent.id)
                                setAgentOpen(false)
                              }}
                            >
                              <span className="truncate">{agent.name}</span>
                              {selectedAgentId === agent.id ? (
                                <CheckIcon className="ml-auto size-4" />
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : null}

              {models.length > 0 && selectedModelId && onModelChange ? (
                <Popover open={modelOpen} onOpenChange={setModelOpen}>
                  <PopoverTrigger asChild>
                    <Button className="h-8 gap-2 px-3" size="sm" type="button" variant="ghost">
                      <span className="max-w-[140px] truncate">
                        {selectedModel?.name ?? 'Select model'}
                      </span>
                      <ChevronsUpDownIcon className="size-3.5 shrink-0 text-foreground-light" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[260px] p-0">
                    <Command>
                      <CommandInput placeholder="Search models..." />
                      <CommandList>
                        <CommandEmpty>No models found.</CommandEmpty>
                        {groupedModels.map(([groupName, groupModels], index) => (
                          <div key={groupName}>
                            {index > 0 ? <CommandSeparator /> : null}
                            <CommandGroup heading={groupName}>
                              {groupModels.map((model) => (
                                <CommandItem
                                  key={model.id}
                                  value={`${model.name} ${model.id}`}
                                  onSelect={() => {
                                    onModelChange(model.id)
                                    setModelOpen(false)
                                  }}
                                >
                                  <span className="truncate">{model.name}</span>
                                  {selectedModelId === model.id ? (
                                    <CheckIcon className="ml-auto size-4" />
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </div>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>

            <Button
              className="h-9 w-9 rounded-full"
              disabled={disabled || !input.trim() || isStreaming}
              onClick={handleSubmit}
              size="icon"
              type="button"
              variant="secondary"
            >
              {isStreaming ? (
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
