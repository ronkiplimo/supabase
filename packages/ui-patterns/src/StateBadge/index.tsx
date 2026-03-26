import {
  Check,
  Clock3,
  SkipForward,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import type { ComponentType, HTMLAttributes, ReactNode } from 'react'
import { cn } from 'ui'

export type StateBadgeState =
  | 'success'
  | 'failure'
  | 'pending'
  | 'skipped'
  | 'enabled'
  | 'disabled'

interface StateBadgeProps extends HTMLAttributes<HTMLDivElement> {
  state: StateBadgeState
  children?: ReactNode
}

type StateBadgeTone = 'positive' | 'destructive' | 'neutral'

const stateBadgeClassName =
  'inline-flex items-center justify-center rounded-md text-center font-mono uppercase whitespace-nowrap font-medium tracking-[0.06em] text-[11px] leading-[1.1] px-[5.5px] py-[3px] transition-all border'

const stateBadgeToneClassNames: Record<StateBadgeTone, string> = {
  positive: 'bg-brand bg-opacity-10 text-brand-600 border-brand-500',
  destructive:
    'bg-destructive bg-opacity-10 text-destructive-600 border-destructive-500',
  neutral: 'bg-surface-75 text-foreground-light border-strong',
}

const stateBadgeConfig: Record<
  StateBadgeState,
  {
    label: string
    tone: StateBadgeTone
    icon: ComponentType<{ className?: string }>
  }
> = {
  success: {
    label: 'Success',
    tone: 'positive',
    icon: Check,
  },
  failure: {
    label: 'Failure',
    tone: 'destructive',
    icon: X,
  },
  pending: {
    label: 'Pending',
    tone: 'neutral',
    icon: Clock3,
  },
  skipped: {
    label: 'Skipped',
    tone: 'neutral',
    icon: SkipForward,
  },
  enabled: {
    label: 'Enabled',
    tone: 'positive',
    icon: ToggleRight,
  },
  disabled: {
    label: 'Disabled',
    tone: 'neutral',
    icon: ToggleLeft,
  },
}

export function StateBadge({ state, className, children, ...props }: StateBadgeProps) {
  const { label, tone, icon: Icon } = stateBadgeConfig[state]
  const toneClassName = stateBadgeToneClassNames[tone]

  return (
    <div
      className={cn('inline-flex items-center whitespace-nowrap', className)}
      data-state={state}
      data-tone={tone}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="state-badge-icon"
        className={cn(stateBadgeClassName, toneClassName, 'rounded-r-none border-r-0')}
      >
        <Icon className="size-3 shrink-0" />
      </span>
      <span
        data-slot="state-badge-label"
        className={cn(stateBadgeClassName, toneClassName, 'rounded-l-none')}
      >
        {children ?? label}
      </span>
    </div>
  )
}
