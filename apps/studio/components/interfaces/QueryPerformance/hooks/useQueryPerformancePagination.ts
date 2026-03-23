import { parseAsInteger, useQueryState } from 'nuqs'
import { useCallback, useEffect, useState } from 'react'

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]
export { PAGE_SIZE_OPTIONS }

/**
 * Manages infinite-scroll pagination for query performance.
 *
 * Instead of offset-based fetching, we increase the SQL LIMIT each time the
 * user scrolls to the bottom. pg_stat_statements queries are fast enough that
 * re-fetching with a larger limit is simpler and avoids accumulation bugs.
 *
 * `visibleLimit` is the current SQL limit. It starts at `pageSize` and grows
 * by `pageSize` each time `loadMore()` is called.
 *
 * The `pageSize` is persisted in the URL so it survives page reloads.
 */
export function useQueryPerformancePagination() {
  const [pageSize, setPageSize] = useQueryState('pageSize', parseAsInteger.withDefault(20))

  const [visibleLimit, setVisibleLimit] = useState(pageSize)

  // Reset visibleLimit when pageSize changes
  useEffect(() => {
    setVisibleLimit(pageSize)
  }, [pageSize])

  const loadMore = useCallback(() => {
    setVisibleLimit((prev) => prev + pageSize)
  }, [pageSize])

  const resetPagination = useCallback(() => {
    setVisibleLimit(pageSize)
  }, [pageSize])

  return {
    pageSize,
    setPageSize,
    visibleLimit,
    loadMore,
    resetPagination,
  }
}
