'use client'

import { ArrowUp, ArrowUpDown, ChevronDown, FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'ui'
import { FilterBar } from 'ui-patterns/FilterBar'
import type { FilterGroup } from 'ui-patterns/FilterBar'
import type { PlatformGridContext } from 'platform'

export function GridToolbar(ctx: PlatformGridContext) {
  const [filterText, setFilterText] = useState('')
  const [filters, setFilters] = useState<FilterGroup>({ logicalOperator: 'AND', conditions: [] })

  const hasSelectedRows = ctx.selectedRows.size > 0

  return (
    <div className="sb-grid-header flex items-center gap-2 px-2 h-10">
      {hasSelectedRows ? (
        <div className="flex gap-2 items-center">
          <Button
            type="default"
            size="tiny"
            icon={<Trash2 size={14} strokeWidth={1.5} />}
            onClick={ctx.onDeleteSelected}
          >
            Delete {ctx.selectedRows.size} row{ctx.selectedRows.size !== 1 ? 's' : ''}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="default"
                size="tiny"
                iconRight={<ChevronDown size={12} strokeWidth={1.5} />}
              >
                Copy
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Copy as CSV</DropdownMenuItem>
              <DropdownMenuItem>Copy as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="default"
                size="tiny"
                iconRight={<ChevronDown size={12} strokeWidth={1.5} />}
              >
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <>
          <div className="flex-1 h-10">
            <FilterBar
              filterProperties={ctx.columns.map((col) => ({
                name: col.name,
                label: col.name,
                type: 'string' as const,
              }))}
              filters={filters}
              onFilterChange={setFilters}
              freeformText={filterText}
              onFreeformTextChange={setFilterText}
              variant="pill"
              className="h-full border-none bg-transparent"
            />
          </div>
          <Button type="text" size="tiny" icon={<ArrowUpDown size={14} strokeWidth={1.5} />}>
            Sort
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="primary"
                size="tiny"
                icon={<ChevronDown strokeWidth={1.5} />}
              >
                Insert
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuItem
                className="group flex gap-2"
                onClick={ctx.onAddRow}
                disabled={!ctx.pkColumn}
              >
                <div className="-mt-2 pr-1.5">
                  <div className="border border-foreground-lighter w-[15px] h-[4px]" />
                  <div className="border border-foreground-lighter w-[15px] h-[4px] my-[2px]" />
                  <div
                    className={cn(
                      'border border-foreground-light w-[15px] h-[4px] translate-x-0.5',
                      'transition duration-200 group-data-[highlighted]:border-brand group-data-[highlighted]:translate-x-0'
                    )}
                  />
                </div>
                <div>
                  <p>Insert row</p>
                  <p className="text-foreground-light">Insert a new row into {ctx.tableName}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="group flex gap-2">
                <div className="flex -mt-2 pr-1.5">
                  <div className="border border-foreground-lighter w-[4px] h-[15px]" />
                  <div className="border border-foreground-lighter w-[4px] h-[15px] mx-[2px]" />
                  <div
                    className={cn(
                      'border border-foreground-light w-[4px] h-[15px] -translate-y-0.5',
                      'transition duration-200 group-data-[highlighted]:border-brand group-data-[highlighted]:translate-y-0'
                    )}
                  />
                </div>
                <div>
                  <p>Insert column</p>
                  <p className="text-foreground-light">Insert a new column into {ctx.tableName}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="group flex gap-2">
                <div className="relative -mt-2">
                  <FileText size={18} strokeWidth={1.5} className="-translate-x-[2px]" />
                  <ArrowUp
                    className={cn(
                      'transition duration-200 absolute bottom-0 right-0 translate-y-1 opacity-0 bg-brand-400 rounded-full',
                      'group-data-[highlighted]:translate-y-0 group-data-[highlighted]:text-brand group-data-[highlighted]:opacity-100'
                    )}
                    strokeWidth={3}
                    size={12}
                  />
                </div>
                <div>
                  <p>Import data from CSV</p>
                  <p className="text-foreground-light">Insert new rows from a CSV</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
}
