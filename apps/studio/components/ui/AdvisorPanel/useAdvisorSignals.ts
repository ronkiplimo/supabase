import { useMemo } from 'react'

import { createAdvisorSignalItems } from './AdvisorPanel.utils'
import { useAdvisorSignalDismissals } from './useAdvisorSignalDismissals'
import { useBannedIPsQuery } from '@/data/banned-ips/banned-ips-query'
import { getAdvisorDebugBannedIPs } from '@/data/banned-ips/debug-banned-ips'

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
  const { dismissSignal, dismissedFingerprintSet } = useAdvisorSignalDismissals(projectRef)

  const data = useMemo(() => {
    const items = createAdvisorSignalItems({
      projectRef,
      bannedIPsData: bannedIPsQuery.data,
      debugBannedIPs,
    })

    return items.filter((item) => !dismissedFingerprintSet.has(item.fingerprint))
  }, [projectRef, bannedIPsQuery.data, debugBannedIPs, dismissedFingerprintSet])

  return {
    data,
    dismissSignal,
    isPending: bannedIPsQuery.isPending,
    isError: bannedIPsQuery.isError,
  }
}
