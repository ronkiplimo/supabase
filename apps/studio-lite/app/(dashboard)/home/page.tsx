'use client'

import { Activity, Database, FileText, HardDrive, LayoutGrid, Table2 } from 'lucide-react'
import Link from 'next/link'
import { Badge } from 'ui'

import { ContainedLayout } from '@/components/layouts'

export default function HomePage() {
  return (
    <ContainedLayout>
      <div className="flex flex-col gap-20">
        <div className="flex flex-col gap-8">
          {/* Project header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">supalite-demo</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground-light">
              <HardDrive size={14} strokeWidth={1.5} />
              <span>./supalite.db</span>
            </div>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusCard
              icon={<LayoutGrid size={20} strokeWidth={1.5} />}
              label="STATUS"
              value="Healthy"
            />
            <StatusCard icon={<Table2 size={20} strokeWidth={1.5} />} label="TABLES" value="3" />
            <StatusCard
              icon={<FileText size={20} strokeWidth={1.5} />}
              label="DATABASE SIZE"
              value="48 KB"
            />
            <StatusCard
              icon={<Database size={20} strokeWidth={1.5} />}
              label="SQLITE VERSION"
              value="3.45.0"
            />
          </div>
        </div>

        {/* Analytics cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} strokeWidth={1.5} className="text-foreground-light" />
              <h2 className="text-sm font-medium text-foreground">Activity</h2>
            </div>
            <span className="text-xs text-foreground-lighter">Last 24 hours</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnalyticsCard
              label="QUERIES EXECUTED"
              value={142}
              data={[4, 12, 28, 8, 18, 32, 22, 18]}
            />
            <AnalyticsCard
              label="ROWS READ"
              value={1284}
              data={[20, 45, 80, 35, 65, 120, 90, 55]}
            />
            <AnalyticsCard label="ROWS WRITTEN" value={37} data={[2, 5, 8, 3, 6, 4, 5, 4]} />
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickLink href="/sql" title="SQL Editor" description="Write and run SQL queries" />
            <QuickLink
              href="/tables"
              title="Table Editor"
              description="Browse and edit your data"
            />
            <QuickLink href="#" title="Documentation" description="Learn about Supalite" disabled />
          </div>
        </div>
      </div>
    </ContainedLayout>
  )
}

function StatusCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-md border p-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-surface-200 text-foreground-light">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-foreground-light uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

function AnalyticsCard({ label, value, data }: { label: string; value: number; data: number[] }) {
  const max = Math.max(...data)

  return (
    <div className="rounded-md border overflow-hidden flex flex-col aspect-[4/3]">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-medium text-foreground-light uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-semibold text-foreground">{value.toLocaleString()}</p>
      </div>
      <div className="flex items-end gap-px h-20 mt-auto px-0">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 bg-brand min-h-[2px]"
            style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function QuickLink({
  href,
  title,
  description,
  disabled,
}: {
  href: string
  title: string
  description: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="rounded-md border p-4 opacity-50 cursor-not-allowed">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-foreground-light mt-1">{description}</p>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="rounded-md border p-4 transition-colors hover:bg-surface-100 hover:border-strong"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-foreground-light mt-1">{description}</p>
    </Link>
  )
}
