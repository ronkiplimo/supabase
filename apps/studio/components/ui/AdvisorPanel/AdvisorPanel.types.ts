import type { Lint } from '@/data/lint/lint-query'
import type { Notification } from '@/data/notifications/notifications-v2-query'
import type { AdvisorItemSource, AdvisorSeverity } from '@/state/advisor-state'

export type AdvisorSignalType = 'banned-ip' | 'public-bucket-listing'

export type AdvisorSignalAction = {
  label: string
  href: string
}

type AdvisorBaseItem = {
  id: string
  title: string
  severity: AdvisorSeverity
  createdAt?: number
  tab: 'security' | 'performance' | 'messages'
  source: AdvisorItemSource
}

export type AdvisorLintItem = AdvisorBaseItem & {
  source: 'lint'
  original: Lint
}

export type AdvisorNotificationItem = AdvisorBaseItem & {
  source: 'notification'
  original: Notification
}

export type AdvisorSignalItem = AdvisorBaseItem & {
  source: 'signal'
  signalType: AdvisorSignalType
  fingerprint: string
  description: string
  detailDescription?: string
  learnMoreHref?: string
  actions: AdvisorSignalAction[]
  sourceData:
    | { type: 'banned-ip'; ip: string }
    | {
        type: 'public-bucket-listing'
        bucketId: string
        bucketName: string
        policyCount: number
        policyNames: string[]
      }
}

export type AdvisorItem = AdvisorLintItem | AdvisorNotificationItem | AdvisorSignalItem
