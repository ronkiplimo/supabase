'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { cn } from 'ui'

const RealtimeLogs = dynamic(() => import('~/components/Products/Functions/RealtimeLogs'))
const QueryLogs = dynamic(() => import('~/components/Products/Functions/QueryLogs'))
const Metrics = dynamic(() => import('~/components/Products/Functions/Metrics'))

const cards = [
  {
    id: 'realtime-logs',
    label: 'Realtime logs',
    paragraph: 'Stream logs to the dashboard in realtime with rich metadata to help debugging',
    render: (isActive: boolean) => <RealtimeLogs isActive={isActive} isInView />,
  },
  {
    id: 'log-explorer',
    label: 'Query Logs via Log explorer',
    paragraph: 'Get deeper insights into function behavior by writing SQL queries on function logs',
    render: (isActive: boolean) => <QueryLogs isActive={isActive} isInView />,
  },
  {
    id: 'metrics',
    label: 'Metrics',
    paragraph: 'Dashboards show the health of your functions at all times',
    render: (isActive: boolean) => <Metrics isActive={isActive} />,
  },
]

function ObservabilityCard({
  card,
  className,
}: {
  card: (typeof cards)[number]
  className?: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={cn('flex flex-col', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex-1 min-h-[285px] overflow-hidden">{card.render(isHovered)}</div>
      <div className="flex flex-col gap-1 px-6 py-5 border-t border-border bg-surface-200">
        <h4 className="text-foreground text-sm font-medium">{card.label}</h4>
        <p className="text-foreground-lighter text-sm">{card.paragraph}</p>
      </div>
    </div>
  )
}

export function ObservabilitySection() {
  return (
    <div>
      {/* Header row */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-[var(--container-max-w,75rem)] px-6 border-x border-border">
          <h3 className="text-2xl md:text-4xl text-foreground-lighter max-w-xl pt-32 pb-8">
            Built-in <span className="text-foreground">observability</span>
          </h3>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="mx-auto max-w-[var(--container-max-w,75rem)] border-x border-border">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {cards.map((card, i) => (
            <ObservabilityCard
              key={card.id}
              card={card}
              className={cn(i < cards.length - 1 && 'md:border-r')}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
