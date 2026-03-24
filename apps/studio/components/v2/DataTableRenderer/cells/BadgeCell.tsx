import { Badge, cn } from 'ui'

import type { DataTableColumn } from '../types'

interface BadgeCellProps {
  value: unknown
  badgeMap?: DataTableColumn['badgeMap']
}

const VARIANT_CLASSES: Record<string, string> = {
  success: 'bg-brand-300 text-brand border-brand-500',
  warning: 'bg-warning-300 text-warning border-warning-500',
  danger: 'bg-destructive-300 text-destructive border-destructive-500',
  info: 'bg-surface-100 text-foreground-light border-border',
  default: 'bg-surface-300 text-foreground-light border-border',
}

export function BadgeCell({ value, badgeMap }: BadgeCellProps) {
  if (value === null || value === undefined) {
    return <span className="text-foreground-lighter italic">NULL</span>
  }

  const key = String(value)
  const mapping = badgeMap?.[key]

  if (mapping) {
    return (
      <Badge size="sm" variant={mapping.variant ?? 'default'} className="">
        {mapping.label}
      </Badge>
    )
  }

  return (
    <Badge variant={VARIANT_CLASSES[mapping.variant] ?? 'default'} className="text-[11px]">
      {key}
    </Badge>
  )
}
