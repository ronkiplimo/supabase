import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdvisorSection } from 'components/interfaces/ProjectHome/AdvisorSection'
import { SIDEBAR_KEYS } from 'components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { AdvisorPanel } from 'components/ui/AdvisorPanel/AdvisorPanel'
import { advisorState } from 'state/advisor-state'
import { sidebarManagerState } from 'state/sidebar-manager-state'
import { render } from 'tests/helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUseProjectLintsQuery,
  mockUseBannedIPsQuery,
  mockUseListablePublicBucketsQuery,
  mockUseSelectedProjectQuery,
  mockUseNotificationsV2Query,
  mockUseNotificationsV2UpdateMutation,
  mockUseTrack,
} = vi.hoisted(() => ({
  mockUseProjectLintsQuery: vi.fn(),
  mockUseBannedIPsQuery: vi.fn(),
  mockUseListablePublicBucketsQuery: vi.fn(),
  mockUseSelectedProjectQuery: vi.fn(),
  mockUseNotificationsV2Query: vi.fn(),
  mockUseNotificationsV2UpdateMutation: vi.fn(),
  mockUseTrack: vi.fn(),
}))

vi.mock('common', async () => {
  const actual = await vi.importActual<typeof import('common')>('common')

  return {
    ...actual,
    useParams: () => ({ ref: 'project-ref' }),
  }
})

vi.mock('data/lint/lint-query', () => ({
  useProjectLintsQuery: mockUseProjectLintsQuery,
}))

vi.mock('data/banned-ips/banned-ips-query', () => ({
  useBannedIPsQuery: mockUseBannedIPsQuery,
}))

vi.mock('data/storage/public-buckets-with-select-policies-query', () => ({
  useListablePublicBucketsQuery: mockUseListablePublicBucketsQuery,
}))

vi.mock('hooks/misc/useSelectedProject', () => ({
  useSelectedProjectQuery: mockUseSelectedProjectQuery,
}))

vi.mock('data/notifications/notifications-v2-query', () => ({
  useNotificationsV2Query: mockUseNotificationsV2Query,
}))

vi.mock('data/notifications/notifications-v2-update-mutation', () => ({
  useNotificationsV2UpdateMutation: mockUseNotificationsV2UpdateMutation,
}))

vi.mock('lib/telemetry/track', () => ({
  useTrack: mockUseTrack,
}))

vi.mock('state/ai-assistant-state', () => ({
  useAiAssistantStateSnapshot: () => ({
    newChat: vi.fn(),
  }),
}))

vi.mock('components/ui/AiAssistantDropdown', () => ({
  AiAssistantDropdown: () => <div data-testid="advisor-assistant-dropdown" />,
}))

vi.mock('./AdvisorFilters', () => ({
  AdvisorFilters: () => <div data-testid="advisor-filters" />,
}))

vi.mock('./AdvisorPanelHeader', () => ({
  AdvisorPanelHeader: () => <div data-testid="advisor-panel-header" />,
}))

describe('Advisor signals integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    advisorState.reset()
    sidebarManagerState.unregisterSidebar(SIDEBAR_KEYS.ADVISOR_PANEL)
    sidebarManagerState.registerSidebar(SIDEBAR_KEYS.ADVISOR_PANEL, () => null)
    sidebarManagerState.clearActiveSidebar()

    mockUseTrack.mockReturnValue(vi.fn())
    mockUseSelectedProjectQuery.mockReturnValue({
      data: { ref: 'project-ref' },
    })
    mockUseProjectLintsQuery.mockImplementation((_variables, options) => {
      if (options?.enabled === false) {
        return {
          data: undefined,
          isPending: false,
          isError: false,
        }
      }

      return {
        data: [
          {
            cache_key: 'lint-1',
            name: 'unknown_lint',
            detail: 'Critical lint detail',
            level: 'ERROR',
            categories: ['SECURITY'],
            metadata: {},
          },
        ],
        isPending: false,
        isError: false,
      }
    })
    mockUseBannedIPsQuery.mockImplementation((_variables, options) => {
      if (options?.enabled === false) {
        return {
          data: undefined,
          isPending: false,
          isError: false,
        }
      }

      return {
        data: {
          banned_ipv4_addresses: ['203.0.113.10'],
        },
        isPending: false,
        isError: false,
      }
    })
    mockUseListablePublicBucketsQuery.mockImplementation((_variables, options) => {
      if (options?.enabled === false) {
        return {
          data: undefined,
          isPending: false,
          isError: false,
        }
      }

      return {
        data: [
          {
            bucket_id: 'avatars',
            bucket_name: 'avatars',
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-02T00:00:00.000Z',
            policy_count: 1,
            policy_names: ['public bucket access'],
          },
        ],
        isPending: false,
        isError: false,
      }
    })
    mockUseNotificationsV2Query.mockReturnValue({
      data: { pages: [[]] },
      isPending: false,
      isError: false,
    })
    mockUseNotificationsV2UpdateMutation.mockReturnValue({
      mutate: vi.fn(),
    })
  })

  afterEach(() => {
    advisorState.reset()
    sidebarManagerState.unregisterSidebar(SIDEBAR_KEYS.ADVISOR_PANEL)
    sidebarManagerState.clearActiveSidebar()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('renders signal items and dismisses them across the homepage and panel', async () => {
    render(
      <>
        <AdvisorSection />
        <AdvisorPanel />
      </>
    )

    expect(screen.getByText('Advisor found 3 issues')).toBeInTheDocument()
    expect(screen.getByText('Public bucket allows listing')).toBeInTheDocument()
    expect(screen.getByText('Banned IP address')).toBeInTheDocument()
    expect(screen.getAllByText('Critical lint detail').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText((_, node) =>
        Boolean(
          node?.textContent?.includes(
            'The bucket avatars has 1 SELECT policy on storage.objects that lets anyone list its contents.'
          )
        )
      ).length
    ).toBeGreaterThan(0)

    await userEvent.click(screen.getByText('Public bucket allows listing'))

    expect(screen.getByText('Entity')).toBeInTheDocument()
    expect(screen.getByText('Issue')).toBeInTheDocument()
    expect(screen.getByText('Resolve')).toBeInTheDocument()
    expect(screen.getAllByTestId('advisor-assistant-dropdown').length).toBeGreaterThan(0)
    expect(screen.getAllByText('avatars').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText((_, node) =>
        Boolean(
          node?.textContent?.includes(
            'The bucket avatars is public, and 1 SELECT policy on storage.objects makes its contents listable.'
          )
        )
      ).length
    ).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      'https://supabase.com/docs/guides/storage/security/access-control'
    )

    await userEvent.click(screen.getByText('Banned IP address'))

    expect(
      screen.getAllByText((_, node) =>
        Boolean(
          node?.textContent?.includes(
            'The IP address 203.0.113.10 is temporarily blocked because of suspicious traffic or repeated failed password attempts.'
          )
        )
      ).length
    ).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      'https://supabase.com/docs/reference/cli/supabase-network-bans'
    )

    await userEvent.click(screen.getByText('Public bucket allows listing'))

    expect(screen.getAllByText('Public bucket allows listing').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    await waitFor(() => {
      expect(screen.queryByText('Public bucket allows listing')).not.toBeInTheDocument()
    })

    expect(screen.getAllByText('Banned IP address').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Critical lint detail').length).toBeGreaterThan(0)
  })

  it('renders debug banned IP signals from the env var when the API returns none', () => {
    vi.stubEnv('NEXT_PUBLIC_ADVISOR_DEBUG_BANNED_IPS', '203.0.113.77')
    mockUseBannedIPsQuery.mockImplementation((_variables, options) => {
      if (options?.enabled === false) {
        return {
          data: undefined,
          isPending: false,
          isError: false,
        }
      }

      return {
        data: {
          banned_ipv4_addresses: [],
        },
        isPending: false,
        isError: false,
      }
    })

    render(
      <>
        <AdvisorSection />
        <AdvisorPanel />
      </>
    )

    expect(screen.getAllByText('Banned IP address').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText((_, node) =>
        Boolean(
          node?.textContent?.includes(
            'The IP address 203.0.113.77 is temporarily blocked because of suspicious traffic or repeated failed password attempts.'
          )
        )
      ).length
    ).toBeGreaterThan(0)
  })
})
