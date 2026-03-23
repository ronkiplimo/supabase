import { useParams } from 'common'
import { DbQueryHook } from 'hooks/analytics/useDbQuery'
import { useEffect } from 'react'
import { useDatabaseSelectorStateSnapshot } from 'state/database-selector'

import { PresetHookResult } from '../Reports/Reports.utils'
import { WithStatements } from './WithStatements/WithStatements'

interface QueryPerformanceProps {
  queryHitRate: PresetHookResult
  queryPerformanceQuery: DbQueryHook<any>
  queryMetrics: PresetHookResult
  pageSize: number
  onPageSizeChange: (size: number | null) => void
  onLoadMore: () => void
}

export const QueryPerformance = ({
  queryHitRate,
  queryPerformanceQuery,
  queryMetrics,
  pageSize,
  onPageSizeChange,
  onLoadMore,
}: QueryPerformanceProps) => {
  const { ref } = useParams()
  const state = useDatabaseSelectorStateSnapshot()

  useEffect(() => {
    state.setSelectedDatabaseId(ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  return (
    <WithStatements
      queryHitRate={queryHitRate}
      queryPerformanceQuery={queryPerformanceQuery}
      queryMetrics={queryMetrics}
      pageSize={pageSize}
      onPageSizeChange={onPageSizeChange}
      onLoadMore={onLoadMore}
    />
  )
}
