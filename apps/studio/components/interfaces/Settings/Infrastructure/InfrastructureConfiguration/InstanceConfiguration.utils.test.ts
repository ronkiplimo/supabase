import type { ResourceWarning } from 'data/usage/resource-warnings-query'
import { describe, expect, it } from 'vitest'

import { buildResourceWarningBadges } from './InstanceConfiguration.utils'

const BASE_WARNING: ResourceWarning = {
  project: 'test-ref',
  is_readonly_mode_enabled: false,
  disk_space_exhaustion: null,
  cpu_exhaustion: null,
  disk_io_exhaustion: null,
  memory_and_swap_exhaustion: null,
  need_pitr: null,
  auth_rate_limit_exhaustion: null,
}

describe('buildResourceWarningBadges', () => {
  it('returns empty array when warnings is undefined', () => {
    expect(buildResourceWarningBadges('ref', undefined)).toEqual([])
  })

  it('returns empty array when no warnings are active', () => {
    expect(buildResourceWarningBadges('ref', BASE_WARNING)).toEqual([])
  })

  it('adds a critical read-only badge first when is_readonly_mode_enabled', () => {
    const badges = buildResourceWarningBadges('ref', {
      ...BASE_WARNING,
      is_readonly_mode_enabled: true,
    })
    expect(badges[0]).toMatchObject({
      key: 'is_readonly_mode_enabled',
      label: 'Read-only',
      severity: 'critical',
      href: '/project/ref/settings/compute-and-disk',
    })
  })

  it('adds a warning-severity disk badge for disk_space_exhaustion=warning', () => {
    const badges = buildResourceWarningBadges('ref', {
      ...BASE_WARNING,
      disk_space_exhaustion: 'warning',
    })
    expect(badges).toHaveLength(1)
    expect(badges[0]).toMatchObject({
      key: 'disk_space_exhaustion',
      label: 'Disk',
      severity: 'warning',
    })
  })

  it('adds a critical-severity disk badge for disk_space_exhaustion=critical', () => {
    const badges = buildResourceWarningBadges('ref', {
      ...BASE_WARNING,
      disk_space_exhaustion: 'critical',
    })
    expect(badges[0]).toMatchObject({ severity: 'critical' })
  })

  it('interpolates projectRef into hrefs', () => {
    const badges = buildResourceWarningBadges('my-project', {
      ...BASE_WARNING,
      cpu_exhaustion: 'warning',
    })
    expect(badges[0].href).toBe('/project/my-project/settings/infrastructure')
  })

  it('preserves order: read-only first, then disk, cpu, disk_io, memory', () => {
    const badges = buildResourceWarningBadges('ref', {
      ...BASE_WARNING,
      is_readonly_mode_enabled: true,
      disk_space_exhaustion: 'critical',
      cpu_exhaustion: 'warning',
      disk_io_exhaustion: 'critical',
      memory_and_swap_exhaustion: 'warning',
    })
    expect(badges.map((b) => b.key)).toEqual([
      'is_readonly_mode_enabled',
      'disk_space_exhaustion',
      'cpu_exhaustion',
      'disk_io_exhaustion',
      'memory_and_swap_exhaustion',
    ])
  })

  it('ignores null exhaustion values', () => {
    const badges = buildResourceWarningBadges('ref', {
      ...BASE_WARNING,
      disk_space_exhaustion: null,
      cpu_exhaustion: 'warning',
    })
    expect(badges).toHaveLength(1)
    expect(badges[0].key).toBe('cpu_exhaustion')
  })
})
