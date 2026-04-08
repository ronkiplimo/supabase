import { describe, expect, it } from 'vitest'

import {
  createAdvisorLintItems,
  createAdvisorNotificationItems,
  createAdvisorSignalDismissalStorageKey,
  createAdvisorSignalItems,
  createBannedIPSignalFingerprint,
  getAdvisorItemSecondaryText,
  sortAdvisorItems,
} from './AdvisorPanel.utils'
import type { IPData } from '@/data/banned-ips/banned-ips-query'
import {
  ADVISOR_DEBUG_BANNED_IPS_ENV_VAR,
  getAdvisorDebugBannedIPs,
} from '@/data/banned-ips/debug-banned-ips'
import type { Lint } from '@/data/lint/lint-query'
import type { Notification } from '@/data/notifications/notifications-v2-query'

const createLint = (overrides: Partial<Lint> = {}): Lint =>
  ({
    cache_key: 'lint-1',
    name: 'unknown_lint',
    detail: 'Critical lint detail',
    level: 'ERROR',
    categories: ['SECURITY'],
    metadata: {},
    ...overrides,
  }) as Lint

const createNotification = (overrides: Partial<Notification> = {}): Notification =>
  ({
    id: 'notification-1',
    inserted_at: '2026-03-01T00:00:00.000Z',
    priority: 'Info',
    status: 'seen',
    data: {
      title: 'Notification title',
      message: 'Notification body',
      actions: [],
    },
    ...overrides,
  }) as Notification

describe('AdvisorPanel.utils', () => {
  it('creates one signal per banned IP', () => {
    const bannedIPsData = {
      banned_ipv4_addresses: ['203.0.113.10'],
    } as IPData

    const result = createAdvisorSignalItems({
      projectRef: 'project-ref',
      bannedIPsData,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      source: 'signal',
      signalType: 'banned-ip',
      fingerprint: 'signal:banned-ip:203.0.113.10:v1',
      title: 'Banned IP address',
    })
  })

  it('creates multiple signals when multiple banned IPs exist', () => {
    const result = createAdvisorSignalItems({
      projectRef: 'project-ref',
      bannedIPsData: {
        banned_ipv4_addresses: ['203.0.113.10', '203.0.113.11'],
      } as IPData,
    })

    expect(result.map((item) => item.fingerprint)).toEqual([
      'signal:banned-ip:203.0.113.10:v1',
      'signal:banned-ip:203.0.113.11:v1',
    ])
  })

  it('parses debug banned IPs from the opt-in env var format', () => {
    expect(
      getAdvisorDebugBannedIPs('203.0.113.10, 203.0.113.11,203.0.113.10, , 203.0.113.12')
    ).toEqual(['203.0.113.10', '203.0.113.11', '203.0.113.12'])
    expect(ADVISOR_DEBUG_BANNED_IPS_ENV_VAR).toBe('NEXT_PUBLIC_ADVISOR_DEBUG_BANNED_IPS')
  })

  it('merges fetched and debug banned IPs without duplicating signals', () => {
    const result = createAdvisorSignalItems({
      projectRef: 'project-ref',
      bannedIPsData: {
        banned_ipv4_addresses: ['203.0.113.10'],
      } as IPData,
      debugBannedIPs: ['203.0.113.10', '203.0.113.11'],
    })

    expect(result.map((item) => item.fingerprint)).toEqual([
      'signal:banned-ip:203.0.113.10:v1',
      'signal:banned-ip:203.0.113.11:v1',
    ])
  })

  it('uses database surface-area metadata for banned IP signals', () => {
    const [bannedIpSignal] = createAdvisorSignalItems({
      projectRef: 'project-ref',
      bannedIPsData: {
        banned_ipv4_addresses: ['203.0.113.10'],
      } as IPData,
    })

    expect(getAdvisorItemSecondaryText(bannedIpSignal)).toBe('Database')
  })

  it('orders mixed lint, signal and notification items by severity and recency', () => {
    const lintItems = createAdvisorLintItems([
      createLint({ cache_key: 'lint-critical', detail: 'Critical lint detail' }),
    ])
    const signalItems = createAdvisorSignalItems({
      projectRef: 'project-ref',
      bannedIPsData: {
        banned_ipv4_addresses: ['203.0.113.10'],
      } as IPData,
    })
    const notificationItems = createAdvisorNotificationItems([
      createNotification({
        id: 'notification-info',
        data: { title: 'Notification title', message: 'Body', actions: [] },
      }),
    ])

    const sorted = sortAdvisorItems([...notificationItems, ...signalItems, ...lintItems])

    expect(sorted.map((item) => item.source)).toEqual(['lint', 'signal', 'notification'])
  })

  it('uses exact resource fingerprints so dismissing one IP does not hide another', () => {
    const dismissedFingerprint = createBannedIPSignalFingerprint('203.0.113.10')
    const signals = createAdvisorSignalItems({
      projectRef: 'project-ref',
      bannedIPsData: {
        banned_ipv4_addresses: ['203.0.113.10', '203.0.113.11'],
      } as IPData,
    })

    const visibleSignals = signals.filter((item) => item.fingerprint !== dismissedFingerprint)

    expect(visibleSignals.map((item) => item.fingerprint)).toEqual([
      'signal:banned-ip:203.0.113.11:v1',
    ])
  })

  it('builds project-scoped dismissal storage keys', () => {
    expect(createAdvisorSignalDismissalStorageKey('project-a')).toBe(
      'advisor-signal-dismissals:project-a'
    )
    expect(createAdvisorSignalDismissalStorageKey('project-b')).toBe(
      'advisor-signal-dismissals:project-b'
    )
  })
})
