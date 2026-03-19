import { ReactNode } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface ConnectionItemProps {
  name: string
  description?: string
  href: string
  icon: ReactNode
  badges?: string[]
}

export function ConnectionItem({ name, description, href, icon, badges }: ConnectionItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface-200 transition-colors group"
    >
      <span className="text-foreground-muted">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-foreground truncate">{name}</p>
        {description && (
          <p className="text-xs text-foreground-lighter truncate">{description}</p>
        )}
        {badges && badges.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {badges.map((badge) => (
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
