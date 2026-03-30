import { describe, expect, it } from 'vitest'

import { generateNodes } from './InstanceConfiguration.utils'

// minimal mock data
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
