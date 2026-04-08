import { useLocalStorageQuery } from '@/hooks/misc/useLocalStorage'
import { useCallback, useMemo } from 'react'

import { createAdvisorSignalDismissalStorageKey } from './AdvisorPanel.utils'

export const useAdvisorSignalDismissals = (projectRef?: string) => {
  const storageKey = projectRef
    ? createAdvisorSignalDismissalStorageKey(projectRef)
    : 'advisor-signal-dismissals:unknown-project'

  const [dismissedFingerprints, setDismissedFingerprints] = useLocalStorageQuery<string[]>(
    storageKey,
    []
  )

  const dismissedFingerprintSet = useMemo(
    () => new Set(dismissedFingerprints),
    [dismissedFingerprints]
  )

  const dismissSignal = useCallback(
    (fingerprint: string) => {
      setDismissedFingerprints((currentDismissals) =>
        currentDismissals.includes(fingerprint)
          ? currentDismissals
          : [...currentDismissals, fingerprint]
      )
    },
    [setDismissedFingerprints]
  )

  return {
    dismissedFingerprints,
    dismissedFingerprintSet,
    dismissSignal,
  }
}
