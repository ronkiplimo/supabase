import dayjs from 'dayjs'
import { Gauge, Inbox, Shield } from 'lucide-react'
import type { ElementType } from 'react'

import type {
  AdvisorItem,
  AdvisorLintItem,
  AdvisorNotificationItem,
  AdvisorSignalItem,
} from './AdvisorPanel.types'
import { lintInfoMap } from '@/components/interfaces/Linter/Linter.utils'
import type { IPData } from '@/data/banned-ips/banned-ips-query'
import type { Lint } from '@/data/lint/lint-query'
import type { Notification, NotificationData } from '@/data/notifications/notifications-v2-query'
import type { ListablePublicBucket } from '@/data/storage/public-buckets-with-select-policies-query'
import type { AdvisorSeverity, AdvisorTab } from '@/state/advisor-state'

export const MAX_HOMEPAGE_ADVISOR_ITEMS = 4

export const severityOrder: Record<AdvisorSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export const lintLevelToSeverity = (level: Lint['level']): AdvisorSeverity => {
  switch (level) {
    case 'ERROR':
      return 'critical'
    case 'WARN':
      return 'warning'
    default:
      return 'info'
  }
}

export const notificationPriorityToSeverity = (
  priority: string | null | undefined
): AdvisorSeverity => {
  switch (priority) {
    case 'Critical':
      return 'critical'
    case 'Warning':
      return 'warning'
    default:
      return 'info'
  }
}

export const createAdvisorSignalDismissalStorageKey = (projectRef: string) =>
  `advisor-signal-dismissals:${projectRef}`

export const ADVISOR_DEBUG_BANNED_IPS_ENV_VAR = 'NEXT_PUBLIC_ADVISOR_DEBUG_BANNED_IPS'

export const createBannedIPSignalFingerprint = (ip: string) => `signal:banned-ip:${ip}:v1`

export const createPublicBucketListingSignalFingerprint = (bucketId: string) =>
  `signal:public-bucket-listing:${bucketId}:v1`

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

const getSignalResourceLabel = (item: AdvisorSignalItem) =>
  item.sourceData.type === 'banned-ip' ? item.sourceData.ip : item.sourceData.bucketName

const toTimestamp = (value?: string | null) => {
  if (!value) return undefined

  const timestamp = dayjs(value).valueOf()
  return Number.isNaN(timestamp) ? undefined : timestamp
}

export const createAdvisorLintItems = (lintData?: Lint[]): AdvisorLintItem[] => {
  if (!lintData) return []

  return lintData
    .map((lint): AdvisorLintItem | null => {
      const categories = lint.categories || []
      const tab = categories.includes('SECURITY')
        ? ('security' as const)
        : categories.includes('PERFORMANCE')
          ? ('performance' as const)
          : undefined

      if (!tab) return null

      return {
        id: lint.cache_key,
        title: lint.detail,
        severity: lintLevelToSeverity(lint.level),
        createdAt: undefined,
        tab,
        source: 'lint',
        original: lint,
      }
    })
    .filter((item): item is AdvisorLintItem => item !== null)
}

export const createAdvisorNotificationItems = (
  notifications?: Notification[]
): AdvisorNotificationItem[] => {
  if (!notifications) return []

  return notifications.map((notification) => {
    const data = notification.data as NotificationData

    return {
      id: notification.id,
      title: data.title,
      severity: notificationPriorityToSeverity(notification.priority),
      createdAt: dayjs(notification.inserted_at).valueOf(),
      tab: 'messages' as const,
      source: 'notification' as const,
      original: notification,
    }
  })
}

export const createAdvisorSignalItems = ({
  projectRef,
  bannedIPsData,
  debugBannedIPs,
  listablePublicBuckets,
}: {
  projectRef?: string
  bannedIPsData?: IPData
  debugBannedIPs?: string[]
  listablePublicBuckets?: ListablePublicBucket[]
}): AdvisorSignalItem[] => {
  if (!projectRef) return []

  const bannedIPs = [
    ...new Set([...(bannedIPsData?.banned_ipv4_addresses ?? []), ...(debugBannedIPs ?? [])]),
  ]

  const bannedIpSignals = bannedIPs.map((ip) => ({
    id: createBannedIPSignalFingerprint(ip),
    fingerprint: createBannedIPSignalFingerprint(ip),
    source: 'signal' as const,
    signalType: 'banned-ip' as const,
    severity: 'warning' as const,
    tab: 'security' as const,
    title: 'Banned IP address',
    description: `The IP address \`${ip}\` is temporarily blocked because of suspicious traffic or repeated failed password attempts.`,
    detailDescription:
      'This IP address is temporarily blocked because of suspicious traffic or repeated failed password attempts. If this block is expected, you can dismiss this signal or remove the ban.',
    learnMoreHref: 'https://supabase.com/docs/reference/cli/supabase-network-bans',
    actions: [
      {
        label: 'Edit network bans',
        href: `/project/${projectRef}/database/settings#banned-ips`,
      },
    ],
    sourceData: { type: 'banned-ip' as const, ip },
  }))

  const publicBucketSignals = (listablePublicBuckets ?? []).map((bucket) => {
    const policyLabel =
      bucket.policy_count === 1 ? '1 SELECT policy' : `${bucket.policy_count} SELECT policies`
    const policyVerb = bucket.policy_count === 1 ? 'lets' : 'let'
    const policyDetailVerb = bucket.policy_count === 1 ? 'makes' : 'make'
    const description = `The bucket \`${bucket.bucket_name}\` has ${policyLabel} on \`storage.objects\` that ${policyVerb} anyone list its contents.`
    const detailDescription = `The bucket \`${bucket.bucket_name}\` is public, and ${policyLabel} on \`storage.objects\` ${policyDetailVerb} its contents listable. Public buckets do not require SELECT policies for object access by URL, so this is often unintentional.`

    return {
      id: createPublicBucketListingSignalFingerprint(bucket.bucket_id),
      fingerprint: createPublicBucketListingSignalFingerprint(bucket.bucket_id),
      source: 'signal' as const,
      signalType: 'public-bucket-listing' as const,
      severity: 'warning' as const,
      createdAt: toTimestamp(bucket.updated_at ?? bucket.created_at),
      tab: 'security' as const,
      title: 'Public bucket allows listing',
      description,
      detailDescription,
      learnMoreHref: 'https://supabase.com/docs/guides/storage/security/access-control',
      actions: [
        {
          label: 'Review bucket',
          href: `/project/${projectRef}/storage/files/buckets/${encodeURIComponent(bucket.bucket_id)}`,
        },
      ],
      sourceData: {
        type: 'public-bucket-listing' as const,
        bucketId: bucket.bucket_id,
        bucketName: bucket.bucket_name,
        policyCount: bucket.policy_count,
        policyNames: bucket.policy_names,
      },
    }
  })

  return [...bannedIpSignals, ...publicBucketSignals]
}

export const sortAdvisorItems = <T extends AdvisorItem>(items: T[]) => {
  return [...items].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff

    const createdDiff = (b.createdAt ?? 0) - (a.createdAt ?? 0)
    if (createdDiff !== 0) return createdDiff

    return getAdvisorItemDisplayTitle(a).localeCompare(getAdvisorItemDisplayTitle(b))
  })
}

export const formatItemDate = (timestamp: number): string => {
  const daysFromNow = dayjs().diff(dayjs(timestamp), 'day')
  const formattedTimeFromNow = dayjs(timestamp).fromNow()
  const formattedInsertedAt = dayjs(timestamp).format('MMM DD, YYYY')
  return daysFromNow > 1 ? formattedInsertedAt : formattedTimeFromNow
}

export const getAdvisorItemDisplayTitle = (item: AdvisorItem): string => {
  if (item.source === 'lint') {
    return (
      lintInfoMap.find((info) => info.name === item.original.name)?.title ||
      item.title.replace(/[`\\]/g, '')
    )
  }

  if (item.source === 'signal') {
    return `${item.title}: ${getSignalResourceLabel(item)}`
  }

  return item.title.replace(/[`\\]/g, '')
}

export const getAdvisorPanelItemDisplayTitle = (item: AdvisorItem): string => {
  if (item.source === 'signal') {
    return item.title
  }

  return getAdvisorItemDisplayTitle(item)
}

export const getAdvisorItemSecondaryText = (item: AdvisorItem): string | undefined => {
  if (item.source === 'lint') {
    return getLintEntityString(item.original)
  }

  if (item.source === 'signal') {
    return item.sourceData.type === 'banned-ip' ? 'Database' : 'Storage'
  }

  return undefined
}

export const tabIconMap: Record<Exclude<AdvisorTab, 'all'>, ElementType> = {
  security: Shield,
  performance: Gauge,
  messages: Inbox,
}

export const severityColorClasses: Record<AdvisorSeverity, string> = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-foreground-light',
}

export const severityBadgeVariants: Record<AdvisorSeverity, 'destructive' | 'warning' | 'default'> =
  {
    critical: 'destructive',
    warning: 'warning',
    info: 'default',
  }

export const severityLabels: Record<AdvisorSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

export const getLintEntityString = (lint: Lint | null): string | undefined => {
  if (!lint?.metadata) {
    return undefined
  }

  if (lint.metadata.entity) {
    return lint.metadata.entity
  }

  if (lint.metadata.schema && lint.metadata.name) {
    return `${lint.metadata.schema}.${lint.metadata.name}`
  }

  return undefined
}
