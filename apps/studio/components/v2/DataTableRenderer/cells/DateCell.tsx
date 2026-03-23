import { Tooltip, TooltipContent, TooltipTrigger } from 'ui'

interface DateCellProps {
  value: unknown
  showTime?: boolean
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

function formatFull(date: Date, showTime: boolean): string {
  if (showTime) {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
  }
  return date.toDateString()
}

export function DateCell({ value, showTime = false }: DateCellProps) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-foreground-lighter italic">NULL</span>
  }

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return <span className="truncate text-foreground-lighter">{String(value)}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate cursor-default">{formatRelative(date)}</span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <span className="font-mono text-xs">{formatFull(date, showTime)}</span>
      </TooltipContent>
    </Tooltip>
  )
}
