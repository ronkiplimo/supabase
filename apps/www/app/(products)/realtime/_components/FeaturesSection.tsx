'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from 'ui'

const FEATURES = [
  {
    title: 'Database changes',
    description:
      'Listen to inserts, updates, and deletes in your Postgres database and react instantly.',
    visual: DatabaseChangesSkeleton,
  },
  {
    title: 'Presence',
    description:
      'Store and synchronize online user state consistently across all connected clients.',
    visual: PresenceSkeleton,
  },
  {
    title: 'Broadcast',
    description: 'Send any data to any client subscribed to the same channel with low latency.',
    visual: BroadcastSkeleton,
  },
]

type ChangeEvent = { op: string; table: string; row: string }

const DB_EVENTS: ChangeEvent[] = [
  { op: 'INSERT', table: 'messages', row: "{ id: 42, text: 'Hello!' }" },
  { op: 'UPDATE', table: 'users', row: "{ id: 7, status: 'online' }" },
  { op: 'DELETE', table: 'messages', row: '{ id: 38 }' },
  { op: 'INSERT', table: 'orders', row: "{ id: 99, total: 49.00 }" },
  { op: 'UPDATE', table: 'messages', row: "{ id: 42, text: 'Updated' }" },
]

function DatabaseChangesSkeleton() {
  const [eventIdx, setEventIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

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
    const timer = setInterval(() => setEventIdx((i) => (i + 1) % DB_EVENTS.length), 2500)
    return () => clearInterval(timer)
  }, [isInView])

  const event = DB_EVENTS[eventIdx]

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="px-6 w-full max-w-[280px]">
        <pre className="text-sm leading-relaxed font-mono overflow-hidden">
          <span className="text-[#6b35dc] dark:text-[#bda4ff]">event</span>
          {': '}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={event.op}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'inline-block',
                event.op === 'INSERT' && 'text-[#15593b] dark:text-[#3ecf8e]',
                event.op === 'UPDATE' && 'text-[#f1a10d] dark:text-[#ffcda1]',
                event.op === 'DELETE' && 'text-[#e5484d] dark:text-[#F06A50]'
              )}
            >
              {event.op}
            </motion.span>
          </AnimatePresence>
          {'\n'}
          <span className="text-[#6b35dc] dark:text-[#bda4ff]">table</span>
          {': '}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={event.table}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="inline-block text-foreground"
            >
              {event.table}
            </motion.span>
          </AnimatePresence>
          {'\n'}
          <span className="text-[#6b35dc] dark:text-[#bda4ff]">new</span>
          {': '}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={event.row}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="inline-block text-foreground-lighter"
            >
              {event.row}
            </motion.span>
          </AnimatePresence>
        </pre>
      </div>
    </div>
  )
}

const USERS = [
  { name: 'Alice', color: '#3ECF8E' },
  { name: 'Bob', color: '#6c63ff' },
  { name: 'Carol', color: '#F06A50' },
  { name: 'Dave', color: '#ffcda1' },
]

function PresenceSkeleton() {
  const [onlineCount, setOnlineCount] = useState(2)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

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
      setOnlineCount((c) => {
        if (c >= USERS.length) return 1
        return c + 1
      })
    }, 2000)
    return () => clearInterval(timer)
  }, [isInView])

  return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-full">
      <div className="flex flex-col gap-2 w-48">
        {USERS.map((user, i) => {
          const isOnline = i < onlineCount
          return (
            <div key={user.name} className="flex items-center gap-3 py-1">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-500',
                  isOnline ? 'bg-brand' : 'bg-foreground-muted/20'
                )}
              />
              <span
                className={cn(
                  'text-sm transition-colors duration-500',
                  isOnline ? 'text-foreground' : 'text-foreground-muted'
                )}
              >
                {user.name}
              </span>
              <span
                className={cn(
                  'text-xs ml-auto transition-colors duration-500',
                  isOnline ? 'text-brand' : 'text-foreground-muted/40'
                )}
              >
                {isOnline ? 'online' : 'offline'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BroadcastSkeleton() {
  const [flash, setFlash] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

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
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
    }, 2000)
    return () => clearInterval(timer)
  }, [isInView])

  const clients = ['Client A', 'Client B', 'Client C']

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full"
      style={{
        maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
      }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Channel hub */}
        <div
          className={cn(
            'px-4 py-2 rounded-lg border text-xs font-medium transition-all duration-300',
            flash
              ? 'bg-brand/10 border-brand/30 text-brand'
              : 'bg-surface-75 border-border text-foreground-muted'
          )}
        >
          channel:room-1
        </div>

        {/* Lines to clients */}
        <div className="flex items-start gap-8">
          {clients.map((client) => (
            <div key={client} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'w-px h-8 transition-colors duration-300',
                  flash ? 'bg-brand/40' : 'bg-foreground-muted/20'
                )}
              />
              <div
                className={cn(
                  'px-3 py-1.5 rounded border text-xs transition-all duration-500',
                  flash
                    ? 'bg-surface-200 border-brand/20 text-foreground'
                    : 'bg-surface-75 border-border text-foreground-muted'
                )}
              >
                {client}
              </div>
            </div>
          ))}
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
            Three ways
            <br />
            <span className="text-foreground">to go realtime</span>
          </h3>
          <p className="text-foreground-lighter text-sm lg:text-base">
            Database changes, presence tracking, and broadcast messaging — everything you need to
            build collaborative, real-time applications.
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
                <div className="relative flex items-center justify-center h-[320px]">
                  <Visual />
                </div>
                <div className="px-6 py-5 flex flex-col gap-1">
                  <h4 className="text-foreground text-sm font-medium">{feature.title}</h4>
                  <p className="text-foreground-lighter text-sm">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
