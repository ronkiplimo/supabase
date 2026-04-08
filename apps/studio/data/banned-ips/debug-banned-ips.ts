export const ADVISOR_DEBUG_BANNED_IPS_ENV_VAR = 'NEXT_PUBLIC_ADVISOR_DEBUG_BANNED_IPS'

export const getAdvisorDebugBannedIPs = (rawValue?: string): string[] => {
  if (!rawValue) return []

  return [
    ...new Set(
      rawValue
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
    ),
  ]
}
