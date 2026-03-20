import { screen } from '@testing-library/react'
import { render } from 'tests/helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LayoutHeader } from './LayoutHeader'

vi.mock('common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('common')>()

  return {
    ...(typeof actual === 'object' ? actual : {}),
    useParams: () => ({ ref: 'default', slug: 'test-org' }),
  }
})

vi.mock('components/interfaces/App/FeaturePreview/FeaturePreviewContext', () => ({
  useIsBranching2Enabled: () => false,
  useIsFloatingMobileToolbarEnabled: () => false,
}))

vi.mock('components/interfaces/Connect/Connect', () => ({ Connect: () => null }))
vi.mock('components/interfaces/ConnectButton/ConnectButton', () => ({
  ConnectButton: () => <div>Connect</div>,
}))
vi.mock('components/interfaces/ConnectSheet/ConnectSheet', () => ({ ConnectSheet: () => null }))
vi.mock('components/interfaces/LocalDropdown', () => ({ LocalDropdown: () => <div>Local</div> }))
vi.mock('components/interfaces/UserDropdown', () => ({ UserDropdown: () => <div>User</div> }))
vi.mock('components/layouts/AppLayout/AdvisorButton', () => ({
  AdvisorButton: () => <button type="button">Exceeding usage limits</button>,
}))
vi.mock('components/layouts/AppLayout/AssistantButton', () => ({
  AssistantButton: () => <div>Assistant</div>,
}))
vi.mock('components/layouts/AppLayout/BranchDropdown', () => ({
  BranchDropdown: () => <div>Branch</div>,
}))
vi.mock('components/layouts/AppLayout/InlineEditorButton', () => ({
  InlineEditorButton: () => <div>Editor</div>,
}))
vi.mock('components/layouts/AppLayout/OrganizationDropdown', () => ({
  OrganizationDropdown: () => <div>Organization</div>,
}))
vi.mock('components/layouts/AppLayout/ProjectDropdown', () => ({
  ProjectDropdown: () => <div>Project</div>,
}))
vi.mock('components/ui/HelpPanel/HelpButton', () => ({ HelpButton: () => <div>Help</div> }))
vi.mock('dev-tools', () => ({ DevToolbarTrigger: () => <div>Dev tools</div> }))
vi.mock('hooks/misc/useLocalStorage', () => ({
  useLocalStorageQuery: () => [true],
}))
vi.mock('hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => ({
    data: {
      slug: 'test-org',
      usage_billing_enabled: false,
    },
  }),
}))
vi.mock('hooks/misc/useSelectedProject', () => ({
  useSelectedProjectQuery: () => ({
    data: { ref: 'default' },
  }),
}))
vi.mock('hooks/ui/useFlag', () => ({
  usePHFlag: () => false,
}))
vi.mock('lib/constants', () => ({
  IS_PLATFORM: true,
}))
vi.mock('data/usage/org-usage-query', () => ({
  useOrgUsageQuery: () => ({
    data: {
      usages: [
        {
          metric: 'ACTIVE_PROJECTS',
          capped: true,
          available_in_plan: true,
          unlimited: false,
          pricing_free_units: 1,
          usage: 2,
        },
      ],
    },
  }),
}))
vi.mock('ui-patterns', () => ({
  CommandMenuTriggerInput: () => <div>Search</div>,
}))

vi.mock('./BreadcrumbsView', () => ({
  BreadcrumbsView: () => <div>Breadcrumbs</div>,
}))
vi.mock('./FeedbackDropdown/FeedbackDropdown', () => ({
  FeedbackDropdown: () => <div>Feedback</div>,
}))
vi.mock('./HomeIcon', () => ({
  HomeIcon: () => <div>Home</div>,
}))
vi.mock('./LocalVersionPopover', () => ({
  LocalVersionPopover: () => <div>Version</div>,
}))
vi.mock('./MergeRequestButton', () => ({
  MergeRequestButton: () => <div>Merge request</div>,
}))

describe('LayoutHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render the legacy usage badge link while the advisor prototype is enabled', () => {
    render(<LayoutHeader />)

    expect(screen.getByRole('button', { name: /exceeding usage limits/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /exceeding usage limits/i })).not.toBeInTheDocument()
  })
})
