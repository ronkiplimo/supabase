import { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronUp, ExternalLink } from 'lucide-react'
import { Collapsible } from 'ui'
import { ConnectionItem as ConnectionItemType } from './types'

interface ConnectionSectionProps {
  title: string
  icon: ReactNode
  count: number
  defaultOpen?: boolean
  children: ReactNode
}

function Root({ children }: { children: ReactNode }) {
  return <div className="py-2 overflow-auto">{children}</div>
}

function Section({ title, icon, count, defaultOpen = true, children }: ConnectionSectionProps) {
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

function Item({ item }: { item: ConnectionItemType }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface-200 transition-colors group"
    >
      <span className="text-foreground-muted">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-foreground truncate">{item.name}</p>
        {item.description && (
          <p className="text-xs text-foreground-lighter truncate">{item.description}</p>
        )}
        {item.badges && item.badges.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {item.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded bg-surface-300 px-1.5 py-0.5 text-[10px] font-mono text-foreground-light"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
      <ExternalLink
        size={12}
        className="text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      />
    </Link>
  )
}

export const ConnectionList = Object.assign(Root, { Section, Item })
