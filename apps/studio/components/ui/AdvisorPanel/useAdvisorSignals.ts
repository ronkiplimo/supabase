import { useMemo } from 'react'

import { createAdvisorSignalItems } from './AdvisorPanel.utils'
import { useAdvisorSignalDismissals } from './useAdvisorSignalDismissals'
import { useBannedIPsQuery } from '@/data/banned-ips/banned-ips-query'

interface UseAdvisorSignalsOptions {
  projectRef?: string
  enabled?: boolean
}

export const useAdvisorSignals = ({
  projectRef,
  enabled = true,
}: UseAdvisorSignalsOptions = {}) => {
  const bannedIPsQuery = useBannedIPsQuery(
    { projectRef },
    {
      enabled,
    }
  )
  const { dismissSignal, dismissedFingerprintSet } = useAdvisorSignalDismissals(projectRef)

  const data = useMemo(() => {
    const items = createAdvisorSignalItems({
      projectRef,
      bannedIPsData: bannedIPsQuery.data,
    })

    return items.filter((item) => !dismissedFingerprintSet.has(item.fingerprint))
  }, [projectRef, bannedIPsQuery.data, dismissedFingerprintSet])

  return {
    data,
    dismissSignal,
    isPending: bannedIPsQuery.isPending,
    isError: bannedIPsQuery.isError,
  }
}
