'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Link as LinkIcon, Shield } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { cn } from 'ui'

const PROVIDERS = [
  'github',
  'google',
  'apple',
  'discord',
  'facebook',
  'gitlab',
  'microsoft',
  'twitter',
  'twitch',
  'spotify',
  'slack',
  'bitbucket',
  'twilio',
  'solana',
  'ethereum',
]

const FEATURES = [
  {
    title: 'All the social providers',
    description:
      'Enable social logins with the click of a button. Google, Facebook, GitHub, Azure, and many more.',
    visual: ProvidersSkeleton,
  },
  {
    title: 'Fully integrated',
    description:
      'Built-in Authentication, Authorization, and User Management — no external services needed.',
    visual: IntegratedSkeleton,
  },
  {
    title: 'Own your data',
    description:
      'User data stored in your Supabase database. No third-party privacy concerns. Host in 16+ locations.',
    visual: DataOwnershipSkeleton,
  },
]

const COLS = 13
const ROWS = 13
const CELL_SIZE = 48
const GAP = 10

function ProvidersSkeleton() {
  const [activeCell, setActiveCell] = useState(Math.floor((COLS * ROWS) / 2))
  const prevCell = useRef(activeCell)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  const totalCells = COLS * ROWS
  const grid = Array.from({ length: totalCells }, (_, i) => PROVIDERS[i % PROVIDERS.length])

  // Keep highlight away from edges so grid always overflows the card
  const MARGIN = 3
  const pickNext = () => {
    const prev = prevCell.current
    const prevCol = prev % COLS
    const prevRow = Math.floor(prev / COLS)
    let next = prev
    const prevProvider = PROVIDERS[prev % PROVIDERS.length]
    // Try until we get a cell 5+ tiles away and a different provider
    for (let attempt = 0; attempt < 50; attempt++) {
      const col = MARGIN + Math.floor(Math.random() * (COLS - MARGIN * 2))
      const row = MARGIN + Math.floor(Math.random() * (ROWS - MARGIN * 2))
      const candidate = row * COLS + col
      const dist = Math.abs(col - prevCol) + Math.abs(row - prevRow)
      if (dist >= 5 && PROVIDERS[candidate % PROVIDERS.length] !== prevProvider) {
        next = candidate
        break
      }
    }
    prevCell.current = next
    return next
  }

  // Compute offset to center the active cell in the viewport
  const activeCol = activeCell % COLS
  const activeRow = Math.floor(activeCell / COLS)
  const centerCol = Math.floor(COLS / 2)
  const centerRow = Math.floor(ROWS / 2)
  const offsetX = (centerCol - activeCol) * (CELL_SIZE + GAP)
  const offsetY = (centerRow - activeRow) * (CELL_SIZE + GAP)

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
    const timer = setInterval(() => setActiveCell(pickNext()), 5000)
    return () => clearInterval(timer)
  }, [isInView])

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full relative overflow-hidden"
      style={{
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 75%)',
      }}
    >
      <div
        className="grid transition-transform duration-1000 ease-in-out"
        style={{
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
          transform: `translate(${offsetX}px, ${offsetY}px)`,
        }}
      >
        {grid.map((provider, i) => {
          const isActive = i === activeCell
          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-lg border transition-all duration-1000',
                isActive ? 'bg-surface-200 border-border scale-110' : 'bg-surface-75 border-border'
              )}
            >
              <Image
                src={`/images/product/auth/${provider}-icon.svg`}
                alt={provider}
                width={20}
                height={20}
                className={cn(
                  'transition-all duration-1000',
                  isActive ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale'
                )}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AUTH_STEPS = [
  { label: 'Sign up' },
  { label: 'Verify email' },
  { label: 'Create session' },
  { label: 'Access granted' },
]

function SignUpPreview() {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-foreground text-sm font-medium">Create an account</div>
      <div className="flex flex-col gap-2">
        <div className="h-8 rounded border border-border bg-surface-200 px-3 flex items-center">
          <span className="text-foreground-muted text-xs">email@example.com</span>
        </div>
        <div className="h-8 rounded border border-border bg-surface-200 px-3 flex items-center">
          <span className="text-foreground-muted text-xs">Password</span>
        </div>
      </div>
      <div className="h-8 rounded bg-brand flex items-center justify-center">
        <span className="text-xs font-medium text-background">Sign up</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-foreground-muted text-[10px]">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-8 rounded border border-border bg-surface-200 flex items-center justify-center">
          <span className="text-foreground-muted text-[10px]">Google</span>
        </div>
        <div className="flex-1 h-8 rounded border border-border bg-surface-200 flex items-center justify-center">
          <span className="text-foreground-muted text-[10px]">GitHub</span>
        </div>
      </div>
    </div>
  )
}

function VerifyEmailPreview() {
  return (
    <div className="flex flex-col gap-3 items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3ECF8E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7l-10 6L2 7" />
        </svg>
      </div>
      <div className="text-foreground text-sm font-medium">Check your email</div>
      <div className="text-foreground-muted text-xs text-center leading-relaxed">
        We sent a verification link to
        <br />
        <span className="text-foreground">email@example.com</span>
      </div>
      <div className="flex gap-1.5 mt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-7 h-8 rounded border border-border bg-surface-200" />
        ))}
      </div>
    </div>
  )
}

function SessionPreview() {
  return (
    <div className="flex flex-col gap-3 justify-center h-full">
      <div className="text-foreground-muted text-[10px] font-mono">Session</div>
      <div className="flex flex-col gap-2">
        {[
          { key: 'access_token', val: 'eyJhbG...kpXVc' },
          { key: 'token_type', val: 'bearer' },
          { key: 'expires_in', val: '3600' },
          { key: 'user.id', val: 'a1b2c3d4-...' },
          { key: 'user.email', val: 'email@example.com' },
          { key: 'user.role', val: 'authenticated' },
        ].map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <span className="text-[#6b35dc] dark:text-[#bda4ff] text-[10px] font-mono">
              {row.key}
            </span>
            <span className="text-foreground-muted text-[10px] font-mono truncate ml-2">
              {row.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccessGrantedPreview() {
  return (
    <div className="flex flex-col gap-3 items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3ECF8E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div className="text-foreground text-sm font-medium">Welcome back</div>
      <div className="text-foreground-muted text-xs text-center">You&apos;re now signed in</div>
      <div className="w-full flex flex-col gap-2 mt-2">
        <div className="h-2.5 rounded bg-foreground-muted/10 w-full" />
        <div className="h-2.5 rounded bg-foreground-muted/10 w-4/5" />
        <div className="h-2.5 rounded bg-foreground-muted/10 w-3/5" />
        <div className="h-2.5 rounded bg-foreground-muted/10 w-2/5" />
      </div>
    </div>
  )
}

const STEP_PREVIEWS = [SignUpPreview, VerifyEmailPreview, SessionPreview, AccessGrantedPreview]

function IntegratedSkeleton() {
  const [step, setStep] = useState(0)
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
    const timer = setInterval(() => setStep((s) => (s + 1) % AUTH_STEPS.length), 3000)
    return () => clearInterval(timer)
  }, [isInView])

  const Preview = STEP_PREVIEWS[step]

  return (
    <div ref={containerRef} className="relative w-full h-full flex overflow-hidden">
      {/* Left: steps */}
      <div className="flex flex-col gap-3 pt-8 pl-6 shrink-0">
        {AUTH_STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-500',
                i <= step ? 'bg-brand' : 'bg-foreground-muted/20'
              )}
            />
            <span
              className={cn(
                'text-sm transition-colors duration-500 whitespace-nowrap',
                i <= step ? 'text-foreground' : 'text-foreground-muted'
              )}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Right: shared card with animated content, overflows card edges */}
      <div
        className="absolute -right-16 -top-8 -bottom-8 flex items-center w-[55%]"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 70% at 30% 50%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 30% 50%, black 30%, transparent 75%)',
        }}
      >
        <div className="w-[280px] bg-surface-75 border border-border rounded-lg p-5 relative overflow-hidden">
          {STEP_PREVIEWS.map((StepPreview, i) => (
            <motion.div
              key={i}
              className={i === 0 ? 'relative' : 'absolute inset-0 p-5'}
              initial={false}
              animate={{
                opacity: i === step ? 1 : 0,
                scale: i === step ? 1 : 0.95,
                filter: i === step ? 'blur(0px)' : 'blur(4px)',
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{ pointerEvents: i === step ? 'auto' : 'none' }}
            >
              <StepPreview />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DataOwnershipSkeleton() {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-center justify-center w-full h-full relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
      }}
    >
      {/* Abstract construction lines */}
      <svg
        className="absolute -inset-16 w-[calc(100%+128px)] h-[calc(100%+128px)] text-foreground-muted/20"
        viewBox="0 0 480 480"
        fill="none"
      >
        <rect
          x="90"
          y="70"
          width="300"
          height="340"
          rx="36"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        <rect
          x="60"
          y="40"
          width="360"
          height="400"
          rx="48"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        <circle cx="240" cy="240" r="140" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="240" cy="240" r="100" stroke="currentColor" strokeWidth="0.5" />
        <line x1="240" y1="0" x2="240" y2="480" stroke="currentColor" strokeWidth="0.5" />
        <line x1="0" y1="240" x2="480" y2="240" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      {/* Highlighted lines on hover */}
      <svg
        className="absolute -inset-16 w-[calc(100%+128px)] h-[calc(100%+128px)] transition-opacity duration-500"
        style={{ opacity: hovered ? 0.35 : 0 }}
        viewBox="0 0 480 480"
        fill="none"
      >
        <circle cx="240" cy="240" r="140" stroke="#3ECF8E" strokeWidth="0.75" opacity="0.3" />
        <rect
          x="90"
          y="70"
          width="300"
          height="340"
          rx="36"
          stroke="#3ECF8E"
          strokeWidth="0.75"
          opacity="0.4"
        />
      </svg>

      {/* Shield icon */}
      <div className="relative">
        <Shield
          size={80}
          strokeWidth={0.75}
          className="transition-colors duration-500"
          style={{
            color: hovered ? '#3ECF8E' : 'hsl(var(--foreground-muted))',
            opacity: hovered ? 1 : 0.6,
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-mono transition-colors duration-500"
          style={{
            color: hovered ? '#3ECF8E' : 'hsl(var(--foreground-muted))',
            opacity: hovered ? 0.8 : 0.4,
          }}
        >
          RLS
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
            <span className="text-foreground">for user authentication</span>
          </h3>
          <p className="text-foreground-lighter text-sm lg:text-base">
            Social logins, email/password, magic links, phone auth, and more — with enterprise-grade
            security built on PostgreSQL&apos;s Row Level Security.
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
