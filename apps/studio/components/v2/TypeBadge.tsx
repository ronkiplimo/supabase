'use client'

import { Auth, Database, EdgeFunctions, Realtime, Storage } from 'icons'
import { List } from 'lucide-react'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import type { DataTabDomain, DataTabType } from '@/stores/v2-dashboard'

type BadgeVariant = DataTabDomain | 'list'

const BADGE_CONFIG: Record<
  BadgeVariant,
  { label: string; icon: React.ReactNode; className: string }
> = {
  list: {
    label: 'List',
    icon: <List className="h-3 w-3" strokeWidth={1.5} />,
    className: 'bg-muted text-foreground-lighter',
  },
  db: {
    label: 'Database',
    icon: <Database className="h-3 w-3" strokeWidth={1.5} />,
    className: 'text-foreground-lighter',
  },
  auth: {
    label: 'Auth',
    icon: <Auth className="h-3 w-3" strokeWidth={1.5} />,
    className: 'text-foreground-lighter',
  },
  st: {
    label: 'Storage',
    icon: <Storage className="h-3 w-3" strokeWidth={1.5} />,
    className: 'text-foreground-lighter',
  },
  fn: {
    label: 'Edge Functions',
    icon: <EdgeFunctions className="h-3 w-3" strokeWidth={1.5} />,
    className: 'text-foreground-lighter',
  },
  rt: {
    label: 'Realtime',
    icon: <Realtime className="h-3 w-3" strokeWidth={1.5} />,
    className: 'text-foreground-lighter',
  },
}

interface TypeBadgeProps {
  domain: DataTabDomain
  type: DataTabType
  className?: string
}

export function TypeBadge({ domain, type, className }: TypeBadgeProps) {
  const variant: BadgeVariant = type === 'list' ? 'list' : domain
  const { label, icon, className: badgeClass } = BADGE_CONFIG[variant]

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center justify-center rounded p-[3px] shrink-0',
            badgeClass,
            className
          )}
        >
          {icon}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
