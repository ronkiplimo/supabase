'use client'

import { cn } from 'ui'

import type { DataTabDomain, DataTabType } from '@/stores/v2-dashboard'

type BadgeVariant = DataTabDomain | 'list'

const BADGE_CONFIG: Record<BadgeVariant, { label: string; className: string }> = {
  list: {
    label: 'LIST',
    className: 'bg-muted text-foreground-lighter',
  },
  db: {
    label: 'DB',
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  auth: {
    label: 'AUTH',
    className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  },
  st: {
    label: 'STOR',
    className: 'bg-green-500/15 text-green-600 dark:text-green-400',
  },
  fn: {
    label: 'FN',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  rt: {
    label: 'RT',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
}

interface TypeBadgeProps {
  domain: DataTabDomain
  type: DataTabType
  className?: string
}

export function TypeBadge({ domain, type, className }: TypeBadgeProps) {
  const variant: BadgeVariant = type === 'list' ? 'list' : domain
  const { label, className: badgeClass } = BADGE_CONFIG[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1 text-[9px] font-semibold leading-4 tracking-wide shrink-0',
        badgeClass,
        className
      )}
    >
      {label}
    </span>
  )
}
