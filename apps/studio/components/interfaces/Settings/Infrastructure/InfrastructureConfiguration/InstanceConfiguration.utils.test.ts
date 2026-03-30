import { describe, expect, it } from 'vitest'

import { generateNodes, getMetricColorClass } from './InstanceConfiguration.utils'

// minimal mock data — cast to any because the full DatabaseDetailResponse type is a generated
// API schema with many optional fields; we only need the fields actually used by generateNodes
const mockPrimary = {
  identifier: 'test-ref',
  region: 'ap-southeast-1',
  cloud_provider: 'AWS',
  inserted_at: '2024-01-01T00:00:00Z',
  status: 'ACTIVE_HEALTHY',
  size: 't4g.micro',
  connectionString: '',
}

describe('generateNodes', () => {
  it('passes infraMetrics null to primary node data when not provided', () => {
    const nodes = generateNodes({
      primary: mockPrimary as any,
      replicas: [],
      loadBalancers: [],
      infraMetrics: null,
      onSelectRestartReplica: () => {},
      onSelectDropReplica: () => {},
    })
    const primaryNode = nodes.find((n) => n.type === 'PRIMARY')
    expect(primaryNode?.data.infraMetrics).toBeNull()
  })

  it('passes infraMetrics to primary node data', () => {
    const metrics = {
      cpu: { current: 30, max: 100 },
      ram: { current: 45, max: 100 },
      disk: { current: 99, max: 100 },
      diskIo: { current: 10, max: 100 },
    }
    const nodes = generateNodes({
      primary: mockPrimary as any,
      replicas: [],
      loadBalancers: [],
      infraMetrics: metrics,
      onSelectRestartReplica: () => {},
      onSelectDropReplica: () => {},
    })
    const primaryNode = nodes.find((n) => n.type === 'PRIMARY')
    expect(primaryNode?.data.infraMetrics).toEqual(metrics)
  })
})

describe('getMetricColorClass', () => {
  it('returns text-foreground-light for values below 70', () => {
    expect(getMetricColorClass(0)).toBe('text-foreground-light')
    expect(getMetricColorClass(50)).toBe('text-foreground-light')
    expect(getMetricColorClass(69.9)).toBe('text-foreground-light')
  })

  it('returns text-warning for values between 70 and 89', () => {
    expect(getMetricColorClass(70)).toBe('text-warning')
    expect(getMetricColorClass(80)).toBe('text-warning')
    expect(getMetricColorClass(89.9)).toBe('text-warning')
  })

  it('returns text-destructive for values at or above 90', () => {
    expect(getMetricColorClass(90)).toBe('text-destructive')
    expect(getMetricColorClass(95)).toBe('text-destructive')
    expect(getMetricColorClass(100)).toBe('text-destructive')
  })
})
