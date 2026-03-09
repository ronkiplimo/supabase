import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthorizedApp } from 'data/oauth/authorized-apps-query'
import { render } from 'tests/helpers'
import { routerMock } from 'tests/lib/route-mock'
import { ProjectOAuthIntegrationsBanner } from './ProjectOAuthIntegrationsBanner'

const mockUseSelectedOrganizationQuery = vi.fn()
const mockUseAuthorizedAppsQuery = vi.fn()

vi.mock('hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => mockUseSelectedOrganizationQuery(),
}))

vi.mock('data/oauth/authorized-apps-query', () => ({
  useAuthorizedAppsQuery: (...args: unknown[]) => mockUseAuthorizedAppsQuery(...args),
}))

const createAuthorizedApp = (overrides: Partial<AuthorizedApp>): AuthorizedApp => ({
  id: 'authorized-app-1',
  app_id: 'oauth-app-1',
  icon: null,
  name: 'Lovable',
  website: 'https://example.com',
  created_by: 'user-1',
  authorized_at: new Date().toISOString(),
  ...overrides,
})

describe('ProjectOAuthIntegrationsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerMock.setCurrentUrl('/project/default/editor')

    mockUseSelectedOrganizationQuery.mockReturnValue({
      data: { slug: 'acme' },
    })

    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [createAuthorizedApp({ name: 'Lovable' })],
      isError: false,
    })
  })

  it('renders on project routes when authorized apps are available', () => {
    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.getByText('This project is connected to Lovable')).toBeInTheDocument()
    expect(
      screen.getByText('Changes made here may affect how your project works in Lovable.')
    ).toBeInTheDocument()

    const manageLink = screen.getByRole('link', { name: 'Manage' })
    expect(manageLink).toHaveAttribute('href', '/org/acme/apps')
    expect(mockUseAuthorizedAppsQuery).toHaveBeenCalledWith(
      { slug: 'acme' },
      expect.objectContaining({ enabled: true })
    )
  })

  it('renders a condensed title when multiple apps are authorized', () => {
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [
        createAuthorizedApp({ id: '1', app_id: '1', name: 'Lovable' }),
        createAuthorizedApp({ id: '2', app_id: '2', name: 'Bolt' }),
        createAuthorizedApp({ id: '3', app_id: '3', name: 'Replit' }),
      ],
      isError: false,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.getByText('This project is connected to Lovable, Bolt, and 1 other app'))
      .toBeInTheDocument()
    expect(
      screen.getByText(
        'Changes made here may affect how your project works in Lovable, Bolt, and 1 other app.'
      )
    ).toBeInTheDocument()
  })

  it('does not render on non-project routes', () => {
    routerMock.setCurrentUrl('/org/acme/apps')

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.queryByText(/This project is connected to/)).not.toBeInTheDocument()
    expect(mockUseAuthorizedAppsQuery).toHaveBeenCalledWith(
      { slug: 'acme' },
      expect.objectContaining({ enabled: false })
    )
  })

  it('does not render when there are no authorized apps', () => {
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [],
      isError: false,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.queryByText(/This project is connected to/)).not.toBeInTheDocument()
  })

  it('does not render when app lookup fails', () => {
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [createAuthorizedApp({ name: 'Lovable' })],
      isError: true,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.queryByText(/This project is connected to/)).not.toBeInTheDocument()
  })

  it('does not render when organization context is unavailable', () => {
    mockUseSelectedOrganizationQuery.mockReturnValue({
      data: undefined,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.queryByText(/This project is connected to/)).not.toBeInTheDocument()
  })

  it('falls back to plug icon when no app icon is provided', () => {
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [createAuthorizedApp({ name: 'Lovable', icon: null })],
      isError: false,
    })

    const { container } = render(<ProjectOAuthIntegrationsBanner />)

    expect(container.querySelector('div[style*="background-image: none"] svg')).toBeInTheDocument()
  })
})
