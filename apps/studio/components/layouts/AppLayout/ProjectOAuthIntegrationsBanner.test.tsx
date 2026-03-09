import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthorizedApp } from 'data/oauth/authorized-apps-query'
import { render } from 'tests/helpers'
import { routerMock } from 'tests/lib/route-mock'
import { ProjectOAuthIntegrationsBanner } from './ProjectOAuthIntegrationsBanner'

const mockUseSelectedOrganizationQuery = vi.fn()
const mockUseAuthorizedAppsQuery = vi.fn()
const mockUseLocalStorageQuery = vi.fn()

vi.mock('hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => mockUseSelectedOrganizationQuery(),
}))

vi.mock('data/oauth/authorized-apps-query', () => ({
  useAuthorizedAppsQuery: (...args: unknown[]) => mockUseAuthorizedAppsQuery(...args),
}))

vi.mock('hooks/misc/useLocalStorage', () => ({
  useLocalStorageQuery: (...args: unknown[]) => mockUseLocalStorageQuery(...args),
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
    mockUseLocalStorageQuery.mockReturnValue([
      '',
      vi.fn(),
      { isSuccess: true, isLoading: false, isError: false, error: null },
    ])

    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [createAuthorizedApp({ name: 'Lovable' })],
      isError: false,
    })
  })

  it('renders on project routes when authorized apps are available', () => {
    render(<ProjectOAuthIntegrationsBanner />)

    expect(
      screen.getByText(
        'This project is integrated with Lovable and dashboard changes may impact this project'
      )
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

    expect(
      screen.getByText(
        'This project is integrated with Lovable, Bolt, and 1 other app and dashboard changes may impact this project'
      )
    ).toBeInTheDocument()
  })

  it('does not render on non-project routes', () => {
    routerMock.setCurrentUrl('/org/acme/apps')

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.queryByText(/Connected to/)).not.toBeInTheDocument()
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

    expect(screen.queryByText(/Connected to/)).not.toBeInTheDocument()
  })

  it('does not render when app lookup fails', () => {
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [createAuthorizedApp({ name: 'Lovable' })],
      isError: true,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.queryByText(/Connected to/)).not.toBeInTheDocument()
  })

  it('does not render when organization context is unavailable', () => {
    mockUseSelectedOrganizationQuery.mockReturnValue({
      data: undefined,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(screen.queryByText(/Connected to/)).not.toBeInTheDocument()
  })

  it('uses query-param mock data on project routes', () => {
    routerMock.setCurrentUrl('/project/default/editor?oauthBannerMock=Lovable,Bolt,Figma')
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [],
      isError: false,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(
      screen.getByText(
        'This project is integrated with Lovable, Bolt, and 1 other app and dashboard changes may impact this project'
      )
    ).toBeInTheDocument()
    expect(mockUseAuthorizedAppsQuery).toHaveBeenCalledWith(
      { slug: 'acme' },
      expect.objectContaining({ enabled: false })
    )
  })

  it('uses local-storage mock data when query param is absent', () => {
    mockUseLocalStorageQuery.mockReturnValue([
      'Lovable,Bolt',
      vi.fn(),
      { isSuccess: true, isLoading: false, isError: false, error: null },
    ])
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [],
      isError: false,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(
      screen.getByText(
        'This project is integrated with Lovable and Bolt and dashboard changes may impact this project'
      )
    ).toBeInTheDocument()
    expect(mockUseAuthorizedAppsQuery).toHaveBeenCalledWith(
      { slug: 'acme' },
      expect.objectContaining({ enabled: false })
    )
  })

  it('supports forcing real data with query-param off even when local mock exists', () => {
    routerMock.setCurrentUrl('/project/default/editor?oauthBannerMock=off')
    mockUseLocalStorageQuery.mockReturnValue([
      'Lovable,Bolt',
      vi.fn(),
      { isSuccess: true, isLoading: false, isError: false, error: null },
    ])
    mockUseAuthorizedAppsQuery.mockReturnValue({
      data: [createAuthorizedApp({ name: 'Replit' })],
      isError: false,
    })

    render(<ProjectOAuthIntegrationsBanner />)

    expect(
      screen.getByText(
        'This project is integrated with Replit and dashboard changes may impact this project'
      )
    ).toBeInTheDocument()
    expect(mockUseAuthorizedAppsQuery).toHaveBeenCalledWith(
      { slug: 'acme' },
      expect.objectContaining({ enabled: true })
    )
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
