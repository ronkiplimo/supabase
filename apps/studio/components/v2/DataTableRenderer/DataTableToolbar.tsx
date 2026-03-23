'use client'

import { Search } from 'lucide-react'
import { cn } from 'ui'
import type { FilterDefinition, FilterState } from './types'

interface DataTableToolbarProps {
  filters?: FilterDefinition[]
  filterState: FilterState
  onFilterChange: (state: FilterState) => void
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode
}

export function DataTableToolbar({
  filters,
  filterState,
  onFilterChange,
  toolbarLeft,
  toolbarRight,
}: DataTableToolbarProps) {
  const hasFilters = filters && filters.length > 0
  const hasContent = hasFilters || toolbarLeft || toolbarRight

  if (!hasContent) return null

  const updateFilter = (id: string, value: string | boolean | string[]) => {
    onFilterChange({ ...filterState, [id]: value })
  }

  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-border bg-dash-sidebar px-1.5 py-1.5 dark:bg-surface-100">
      {/* Left: custom slot + filter controls */}
      <div className="flex flex-1 min-w-0 items-center gap-2">
        {toolbarLeft}
        {filters?.map((filter) => {
          if (filter.type === 'search') {
            return (
              <div key={filter.id} className="relative flex items-center">
                <Search className="absolute left-2 h-3.5 w-3.5 text-foreground-lighter pointer-events-none" />
                <input
                  type="text"
                  placeholder={filter.placeholder ?? `Filter ${filter.label.toLowerCase()}...`}
                  value={(filterState[filter.id] as string) ?? ''}
                  onChange={(e) => updateFilter(filter.id, e.target.value)}
                  className={cn(
                    'h-8 rounded-md border border-control bg-surface-100',
                    'pl-7 pr-3 text-xs text-foreground placeholder:text-foreground-lighter',
                    'focus:outline-none focus:ring-1 focus:ring-brand',
                    'min-w-[180px]'
                  )}
                />
              </div>
            )
          }

          if (filter.type === 'select' || filter.type === 'multi-select') {
            return (
              <select
                key={filter.id}
                value={(filterState[filter.id] as string) ?? ''}
                onChange={(e) => updateFilter(filter.id, e.target.value)}
                className={cn(
                  'h-8 rounded-md border border-control bg-surface-100',
                  'px-2 text-xs text-foreground',
                  'focus:outline-none focus:ring-1 focus:ring-brand'
                )}
              >
                <option value="">{filter.placeholder ?? `All ${filter.label}`}</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )
          }

          if (filter.type === 'toggle') {
            const isActive = Boolean(filterState[filter.id])
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => updateFilter(filter.id, !isActive)}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
                  isActive
                    ? 'border-brand/50 bg-brand/10 text-brand'
                    : 'border-control bg-surface-100 text-foreground-light hover:text-foreground'
                )}
              >
                {filter.label}
              </button>
            )
          }

          return null
        })}
      </div>

      {/* Right: custom slot */}
      {toolbarRight && (
        <div className="flex shrink-0 items-center gap-2">{toolbarRight}</div>
      )}
    </div>
  )
}
