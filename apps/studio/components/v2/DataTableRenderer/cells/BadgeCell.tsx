import { Badge } from 'ui'
import type { DataTableColumn } from '../types'

interface BadgeCellProps {
  value: unknown
  badgeMap?: DataTableColumn['badgeMap']
}

const VARIANT_CLASSES: Record<string, string> = {
  success: 'bg-brand-400/20 text-brand border-brand/20',
  warning: 'bg-warning-300/30 text-warning-600 border-warning/30',
  danger: 'bg-destructive-300/30 text-destructive border-destructive/30',
  info: 'bg-foreground-muted/20 text-foreground-light border-border',
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
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium ${VARIANT_CLASSES[mapping.variant] ?? VARIANT_CLASSES.default}`}
      >
        {mapping.label}
      </span>
    )
  }

  return (
    <Badge variant="default" className="text-[11px]">
      {key}
    </Badge>
  )
}
