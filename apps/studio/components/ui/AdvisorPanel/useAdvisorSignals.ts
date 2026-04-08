import { useMemo } from 'react'

import { createAdvisorSignalItems, getAdvisorDebugBannedIPs } from './AdvisorPanel.utils'
import { useAdvisorSignalDismissals } from './useAdvisorSignalDismissals'
import { useBannedIPsQuery } from '@/data/banned-ips/banned-ips-query'
import { useListablePublicBucketsQuery } from '@/data/storage/public-buckets-with-select-policies-query'

interface UseAdvisorSignalsOptions {
  projectRef?: string
  enabled?: boolean
}

export const useAdvisorSignals = ({
  projectRef,
  enabled = true,
}: UseAdvisorSignalsOptions = {}) => {
  // TODO(DEPR-430): Remove this local-only shim once network bans can be created for local testing.
  const debugBannedIPs = getAdvisorDebugBannedIPs(process.env.NEXT_PUBLIC_ADVISOR_DEBUG_BANNED_IPS)

  const bannedIPsQuery = useBannedIPsQuery(
    { projectRef },
    {
      enabled,
    }
  )
  const listablePublicBucketsQuery = useListablePublicBucketsQuery(
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
      debugBannedIPs,
      listablePublicBuckets: listablePublicBucketsQuery.data,
    })

    return items.filter((item) => !dismissedFingerprintSet.has(item.fingerprint))
  }, [
    projectRef,
    bannedIPsQuery.data,
    listablePublicBucketsQuery.data,
    debugBannedIPs,
    dismissedFingerprintSet,
  ])

  return {
    data,
    dismissSignal,
    isPending: bannedIPsQuery.isPending || listablePublicBucketsQuery.isPending,
    isError: bannedIPsQuery.isError || listablePublicBucketsQuery.isError,
  }
}
