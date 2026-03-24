'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from 'ui'

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('rounded bg-foreground-muted/10', className)} />
}

const FEATURES = [
  {
    title: 'Just Postgres',
    description: 'A dedicated Postgres database.',
    detail: '100% portable. Bring your existing Postgres database, or migrate away at any time.',
    visual: PostgresSkeleton,
  },
  {
    title: 'Secure by default',
    description: "Leveraging Postgres's proven Row Level Security.",
    detail: 'Integrated with JWT authentication which controls exactly what your users can access.',
    visual: RLSSkeleton,
  },
  {
    title: 'Realtime enabled',
    description: 'Data-change listeners over websockets.',
    detail: 'Subscribe and react to database changes, milliseconds after they happen.',
    visual: RealtimeSkeleton,
  },
]

function PostgresSkeleton() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 390 430"
        className="w-72 h-72 opacity-80"
      >
        {/* Elephant logo */}
        <path
          stroke="hsl(var(--foreground-muted))"
          strokeWidth="1.5"
          d="M192.144 125.816h-53.465c-8.506 0-16.159 5.17-19.334 13.061L99.0045 189.43c-3.0613 7.608-1.3448 16.306 4.3775 22.181l10.232 10.506c4.792 4.919 7.474 11.516 7.474 18.384l-.001 14.473c0 20.197 16.373 36.569 36.569 36.569 6.16 0 11.154-4.993 11.154-11.153l.001-86.241c0-18.629 7.441-36.486 20.668-49.602 2.746-2.723 7.178-2.704 9.9.041 2.722 2.745 2.703 7.178-.042 9.9-10.577 10.488-16.526 24.766-16.526 39.661l-.001 86.241c0 13.892-11.262 25.153-25.154 25.153-27.928 0-50.569-22.64-50.569-50.569l.001-14.474c0-3.218-1.257-6.309-3.503-8.615L93.353 221.38c-9.5904-9.847-12.4673-24.424-7.3366-37.176l20.3406-50.553c5.308-13.192 18.101-21.835 32.322-21.835h55.729v.084h10.339c49.104 0 88.91 39.806 88.91 88.91v50.842c0 3.866-3.134 7-7 7s-7-3.134-7-7V200.81c0-41.372-33.538-74.91-74.91-74.91H193.23c-.37 0-.732-.029-1.086-.084Z"
        />
        <path
          stroke="hsl(var(--foreground-muted))"
          strokeWidth="1.5"
          d="M210.03 283.94c0-3.866-3.134-7-7-7s-7 3.134-7 7v3.113c0 26.959 21.854 48.814 48.813 48.814 26.351 0 47.825-20.879 48.781-46.996h24.614c3.866 0 7-3.134 7-7s-3.134-7-7-7h-26.841c-30.744 0-60.256-12.083-82.173-33.643-2.756-2.711-7.188-2.675-9.899.081-2.711 2.756-2.675 7.188.081 9.9 21.725 21.371 50.116 34.423 80.228 37.134-.679 18.629-15.995 33.524-34.791 33.524-19.227 0-34.813-15.587-34.813-34.814v-3.113Z"
        />
        <path
          stroke="hsl(var(--foreground-muted))"
          strokeWidth="1.5"
          d="M238.03 202.145c0 4.792 3.885 8.677 8.677 8.677s8.676-3.885 8.676-8.677-3.884-8.676-8.676-8.676-8.677 3.884-8.677 8.676Z"
        />
      </svg>
    </div>
  )
}

// SQL tokens for typewriter effect — each token is { text, className }
const sqlTokens = [
  { text: 'CREATE POLICY', cls: 'text-brand' },
  { text: ' ' },
  { text: '"read_only"', cls: 'text-foreground-light' },
  { text: '\n' },
  { text: 'ON', cls: 'text-brand' },
  { text: ' public.users' },
  { text: '\n' },
  { text: 'FOR SELECT', cls: 'text-brand' },
  { text: '\n' },
  { text: 'USING', cls: 'text-brand' },
  { text: ' (auth.role() = ' },
  { text: "'authenticated'", cls: 'text-foreground-light' },
  { text: ');' },
]

function RLSSkeleton() {
  const [visibleChars, setVisibleChars] = useState(0)
  const [typing, setTyping] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  const hasAnimated = useRef(false)

  const totalChars = sqlTokens.reduce((sum, t) => sum + t.text.length, 0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.3,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isInView || hasAnimated.current) return
    hasAnimated.current = true

    let char = 0
    const typeInterval = setInterval(() => {
      char++
      setVisibleChars(char)
      if (char >= totalChars) {
        clearInterval(typeInterval)
        setTyping(false)
      }
    }, 15)

    return () => clearInterval(typeInterval)
  }, [isInView, totalChars])

  // Render visible portion of SQL tokens
  function renderTypedSQL() {
    let remaining = visibleChars
    return sqlTokens.map((token, i) => {
      if (remaining <= 0) return null
      const show = token.text.slice(0, remaining)
      remaining -= token.text.length
      return (
        <span key={i} className={token.cls}>
          {show}
        </span>
      )
    })
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-8 w-full h-full overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
      }}
    >
      {/* SQL snippet with typewriter — centered */}
      <div className="flex items-center flex-1 w-full px-4">
        <pre className="text-sm leading-relaxed font-mono text-foreground-muted">
          {renderTypedSQL()}
          {typing && (
            <span className="inline-block w-[2px] h-[1em] bg-brand align-middle animate-pulse ml-px" />
          )}
        </pre>
      </div>
    </div>
  )
}

type ChatMsg = { id: number; user: string; text: string }

const initialMessages: ChatMsg[] = [
  { id: 1, user: 'Alice', text: 'Hey, is the deploy ready?' },
  { id: 2, user: 'Bob', text: 'Almost — running final tests now.' },
  { id: 3, user: 'Alice', text: 'Nice, let me know when it\u2019s live.' },
]

const incomingMessages: ChatMsg[] = [
  { id: 4, user: 'Bob', text: 'All green. Deploying now 🚀' },
  { id: 5, user: 'Alice', text: 'Awesome, checking it out.' },
  { id: 6, user: 'Bob', text: 'Latency dropped to 42ms!' },
  { id: 7, user: 'Alice', text: 'That\u2019s a big improvement.' },
  { id: 8, user: 'Bob', text: 'Yeah, the new index helped.' },
  { id: 9, user: 'Alice', text: 'Should we update the docs?' },
  { id: 10, user: 'Bob', text: 'Already on it.' },
]

const chatCols = ['id', 'user', 'text'] as const

function RealtimeSkeleton() {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages)
  const [tableFlashId, setTableFlashId] = useState<number | null>(null)
  const [chatFlashId, setChatFlashId] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  const nextMsgIdx = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.3,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isInView) return

    const timer = setInterval(() => {
      const msg = incomingMessages[nextMsgIdx.current % incomingMessages.length]
      // Give each added message a unique id
      const newMsg = { ...msg, id: Date.now() + nextMsgIdx.current }
      nextMsgIdx.current++

      // Add to table + flash
      setMessages((prev) => [...prev, newMsg])
      setTableFlashId(newMsg.id)

      // Autoscroll table
      requestAnimationFrame(() => {
        tableScrollRef.current?.scrollTo({
          top: tableScrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      })

      // Chat updates after short delay (realtime propagation)
      setTimeout(() => {
        setChatFlashId(newMsg.id)
        requestAnimationFrame(() => {
          chatScrollRef.current?.scrollTo({
            top: chatScrollRef.current.scrollHeight,
            behavior: 'smooth',
          })
        })
        setTimeout(() => {
          setTableFlashId(null)
          setChatFlashId(null)
        }, 600)
      }, 200)
    }, 3000)

    return () => clearInterval(timer)
  }, [isInView])

  return (
    <div ref={containerRef} className="flex flex-col w-full h-full overflow-hidden p-4">
      {/* Table with scrollable body */}
      <div className="w-full border border-border rounded overflow-hidden">
        <table className="w-full border-collapse text-[10px] !mt-0 table-fixed">
          <colgroup>
            <col className="w-[100px]" />
            <col className="w-[50px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-surface-200">
              <th className="border-b border-r border-default px-2 py-1 text-left font-medium text-foreground text-[10px]">
                id
              </th>
              <th className="border-b border-r border-default px-2 py-1 text-left font-medium text-foreground text-[10px]">
                user
              </th>
              <th className="border-b border-default px-2 py-1 text-left font-medium text-foreground text-[10px]">
                text
              </th>
            </tr>
          </thead>
        </table>
        <div
          ref={tableScrollRef}
          className="max-h-[48px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
          }}
        >
          <table className="w-full border-collapse text-[10px] !mt-0 table-fixed">
            <colgroup>
              <col className="w-[100px]" />
              <col className="w-[50px]" />
              <col />
            </colgroup>
            <tbody className="[&>tr:last-child>td]:border-b-0">
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  className="bg-surface-75 transition-colors duration-500"
                  style={
                    tableFlashId === msg.id
                      ? { backgroundColor: 'hsl(var(--brand-200) / 0.8)' }
                      : undefined
                  }
                >
                  <td className="border-b border-r border-secondary px-2 py-1 text-foreground-muted">
                    {msg.id}
                  </td>
                  <td className="border-b border-r border-secondary px-2 py-1 text-foreground">
                    {msg.user}
                  </td>
                  <td className="border-b border-secondary px-2 py-1 text-foreground truncate">
                    {msg.text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connecting line */}
      <div className="flex justify-center">
        <div className="w-px h-8 bg-border" />
      </div>

      {/* Chat UI */}
      <div className="w-full max-w-[90%] mx-auto border border-border rounded-lg bg-surface-75 flex flex-col overflow-hidden max-h-[96px]">
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-2.5 py-2 flex flex-col gap-1.5"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
          }}
        >
          {messages.map((msg) => {
            const isAlice = msg.user === 'Alice'
            const isFlashed = chatFlashId === msg.id
            return (
              <div key={msg.id} className={cn('flex', isAlice ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] px-2 py-1 rounded-lg text-[9px] leading-relaxed transition-colors duration-500',
                    isAlice
                      ? 'bg-brand/15 text-foreground rounded-br-sm'
                      : 'bg-surface-200 text-foreground rounded-bl-sm'
                  )}
                  style={
                    isFlashed ? { outline: '1px solid hsl(var(--brand-default) / 0.5)' } : undefined
                  }
                >
                  {msg.text}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function FeaturesSection() {
  return (
    <div className="py-24 flex flex-col gap-16">
      {/* Header */}
      <div className="mx-auto max-w-[var(--container-max-w,75rem)] px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end">
          <h3 className="text-2xl md:text-4xl text-foreground-lighter max-w-xl">
            Everything you need
            <br />
            <span className="text-foreground">from your database</span>
          </h3>
          <p className="text-foreground-lighter text-sm lg:text-base">
            Every Supabase project is a full Postgres database with realtime functionality,
            fine-grained access controls, and instant APIs — no extra configuration required.
          </p>
        </div>
      </div>

      {/* 3-col grid */}
      <div className="mx-auto max-w-[var(--container-max-w,75rem)] px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FEATURES.map((feature) => {
            const Visual = feature.visual
            return (
              <div
                key={feature.title}
                className="flex flex-col bg-surface-75 border border-border rounded-lg overflow-hidden"
              >
                {/* Visual with overlaid title */}
                <div className="relative flex items-center justify-center h-[320px]">
                  <Visual />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <span className="bg-background/80 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-1 rounded-full border border-border">
                      {feature.title}
                    </span>
                  </div>
                </div>
                {/* Content */}
                <div className="px-6 py-5 flex flex-col gap-1">
                  <h4 className="text-foreground text-sm font-medium">{feature.description}</h4>
                  <p className="text-foreground-lighter text-sm">{feature.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
