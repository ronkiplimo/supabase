import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdvisorButton } from '@/components/layouts/AppLayout/AdvisorButton'
import { render } from '@/tests/helpers'

const {
  mockUseProjectLintsQuery,
  mockUseNotificationsV2Query,
  mockUseAdvisorSignals,
  mockToggleSidebar,
} = vi.hoisted(() => ({
  mockUseProjectLintsQuery: vi.fn(),
  mockUseNotificationsV2Query: vi.fn(),
  mockUseAdvisorSignals: vi.fn(),
  mockToggleSidebar: vi.fn(),
}))

vi.mock('@/data/lint/lint-query', () => ({
  useProjectLintsQuery: mockUseProjectLintsQuery,
}))

vi.mock('@/data/notifications/notifications-v2-query', () => ({
  useNotificationsV2Query: mockUseNotificationsV2Query,
}))

vi.mock('@/components/ui/AdvisorPanel/useAdvisorSignals', () => ({
  useAdvisorSignals: mockUseAdvisorSignals,
}))

vi.mock('@/state/sidebar-manager-state', () => ({
  useSidebarManagerSnapshot: () => ({
    toggleSidebar: mockToggleSidebar,
    activeSidebar: undefined,
  }),
}))

describe('AdvisorButton', () => {
  beforeEach(() => {
    mockUseProjectLintsQuery.mockReturnValue({ data: [], isPending: false, isError: false })
    mockUseNotificationsV2Query.mockReturnValue({
      data: { pages: [[]] },
      isPending: false,
      isError: false,
    })
    mockUseAdvisorSignals.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      dismissSignal: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows a warning dot when advisor signals are present', () => {
    mockUseAdvisorSignals.mockReturnValue({
      data: [
        {
          id: 'signal-1',
          fingerprint: 'signal:public-bucket-listing:avatars:v1',
          source: 'signal',
          signalType: 'public-bucket-listing',
          severity: 'warning',
          tab: 'security',
          title: 'Public bucket allows listing',
          description: 'Signal',
          actions: [],
          sourceData: {
            type: 'public-bucket-listing',
            bucketId: 'avatars',
            bucketName: 'avatars',
            policyCount: 1,
            policyNames: ['public bucket access'],
          },
        },
      ],
      isPending: false,
      isError: false,
      dismissSignal: vi.fn(),
    })

    const { container } = render(<AdvisorButton projectRef="project-ref" />)

    expect(container.querySelector('.bg-warning')).toBeInTheDocument()
    expect(container.querySelector('.bg-destructive')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-brand')).not.toBeInTheDocument()
  })

  it('keeps the destructive dot when a critical issue is present', () => {
    mockUseProjectLintsQuery.mockReturnValue({
      data: [
        {
          cache_key: 'lint-1',
          name: 'unknown_lint',
          detail: 'Critical lint detail',
          description: 'Description',
          level: 'ERROR',
          categories: ['SECURITY'],
          metadata: {},
        },
      ],
      isPending: false,
      isError: false,
    })
    mockUseAdvisorSignals.mockReturnValue({
      data: [
        {
          id: 'signal-1',
          fingerprint: 'signal:public-bucket-listing:avatars:v1',
          source: 'signal',
          signalType: 'public-bucket-listing',
          severity: 'warning',
          tab: 'security',
          title: 'Public bucket allows listing',
          description: 'Signal',
          actions: [],
          sourceData: {
            type: 'public-bucket-listing',
            bucketId: 'avatars',
            bucketName: 'avatars',
            policyCount: 1,
            policyNames: ['public bucket access'],
          },
        },
      ],
      isPending: false,
      isError: false,
      dismissSignal: vi.fn(),
    })

    const { container } = render(<AdvisorButton projectRef="project-ref" />)

    expect(container.querySelector('.bg-destructive')).toBeInTheDocument()
    expect(container.querySelector('.bg-warning')).not.toBeInTheDocument()
  })

  it('falls back to the brand dot for unread notifications when there are no issues', () => {
    mockUseNotificationsV2Query.mockReturnValue({
      data: {
        pages: [
          [
            {
              id: 'notif-1',
              status: 'new',
              priority: 'Info',
            },
          ],
        ],
      },
      isPending: false,
      isError: false,
    })

    const { container } = render(<AdvisorButton projectRef="project-ref" />)

    expect(container.querySelector('.bg-brand')).toBeInTheDocument()
    expect(container.querySelector('.bg-warning')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-destructive')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
