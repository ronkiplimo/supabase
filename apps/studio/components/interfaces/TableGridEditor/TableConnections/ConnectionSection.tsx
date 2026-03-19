import { ReactNode } from 'react'
import { ChevronUp } from 'lucide-react'
import { Collapsible } from 'ui'

interface ConnectionSectionProps {
  title: string
  icon: ReactNode
  count: number
  defaultOpen?: boolean
  children: ReactNode
}

export function ConnectionSection({
  title,
  icon,
  count,
  defaultOpen = true,
  children,
}: ConnectionSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Collapsible.Trigger asChild>
        <button className="flex w-full items-center gap-2 py-2 px-4 text-sm font-medium text-foreground hover:bg-surface-200 transition-colors group">
          {icon}
          <span className="flex-1 text-left">{title}</span>
          <span className="flex items-center justify-center rounded-full bg-surface-300 px-1.5 min-w-[20px] h-5 text-xs text-foreground-light font-mono">
            {count}
          </span>
          <ChevronUp
            size={14}
            className="text-foreground-muted transition data-open-parent:rotate-0 data-closed-parent:rotate-180"
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        {count === 0 ? (
          <p className="text-xs text-foreground-lighter px-4 py-2">
            No {title.toLowerCase()} found for this table
          </p>
        ) : (
          <div className="pb-2">{children}</div>
        )}
      </Collapsible.Content>
    </Collapsible>
  )
}
