import { screen } from '@testing-library/react'
import { MANAGED_BY } from 'lib/constants/infrastructure'
import { createMockOrganization, render } from 'tests/helpers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUseAwsRedirectQuery,
  mockUseSelectedOrganizationQuery,
  mockUseVercelRedirectQuery,
} = vi.hoisted(() => ({
  mockUseAwsRedirectQuery: vi.fn(),
  mockUseSelectedOrganizationQuery: vi.fn(),
  mockUseVercelRedirectQuery: vi.fn(),
}))

vi.mock('hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: mockUseSelectedOrganizationQuery,
}))

vi.mock('data/integrations/vercel-redirect-query', () => ({
  useVercelRedirectQuery: mockUseVercelRedirectQuery,
}))

vi.mock('data/integrations/aws-redirect-query', () => ({
  useAwsRedirectQuery: mockUseAwsRedirectQuery,
}))

vi.mock('hooks/misc/withAuth', () => ({
  withAuth: (Component: any) => Component,
}))

vi.mock('components/ui/PartnerIcon', () => ({
  default: () => <div data-testid="partner-icon" />,
}))

import OrganizationLayout from './OrganizationLayout'

const renderLayout = () =>
  render(
    <OrganizationLayout>
      <div>Organization content</div>
    </OrganizationLayout>
  )

describe('OrganizationLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseVercelRedirectQuery.mockReturnValue({ data: undefined, isSuccess: false })
    mockUseAwsRedirectQuery.mockReturnValue({ data: undefined, isSuccess: false })
  })

  it('renders the exact Vercel banner copy and manage URL', () => {
    mockUseSelectedOrganizationQuery.mockReturnValue({
      data: createMockOrganization({
        managed_by: MANAGED_BY.VERCEL_MARKETPLACE,
        partner_id: 'vercel-installation-id',
      }),
    })
    mockUseVercelRedirectQuery.mockReturnValue({
      data: { url: 'https://vercel.com/manage-org' },
      isSuccess: true,
    })

    renderLayout()

    expect(screen.getByText('This organization is managed via Vercel Marketplace')).toBeTruthy()
    expect(
      screen.getByText('Billing and some organization access settings are managed in Vercel.')
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Manage' }).getAttribute('href')).toBe(
      'https://vercel.com/manage-org'
    )
    expect(mockUseVercelRedirectQuery).toHaveBeenCalledWith(
      { installationId: 'vercel-installation-id' },
      expect.objectContaining({ enabled: true })
    )
    expect(mockUseAwsRedirectQuery).toHaveBeenCalledWith(
      { organizationSlug: 'abcdefghijklmnopqrst' },
      expect.objectContaining({ enabled: false })
    )
  })

  it('renders the exact AWS banner copy and manage URL', () => {
    mockUseSelectedOrganizationQuery.mockReturnValue({
      data: createMockOrganization({
        managed_by: MANAGED_BY.AWS_MARKETPLACE,
        slug: 'aws-org',
      }),
    })
    mockUseAwsRedirectQuery.mockReturnValue({
      data: { url: 'https://console.aws.amazon.com/billing/home' },
      isSuccess: true,
    })

    renderLayout()

    expect(screen.getByText('This organization is billed via AWS Marketplace')).toBeTruthy()
    expect(
      screen.getByText('Changes to billing and payment details must be made in AWS.')
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Manage' }).getAttribute('href')).toBe(
      'https://console.aws.amazon.com/billing/home'
    )
    expect(mockUseAwsRedirectQuery).toHaveBeenCalledWith(
      { organizationSlug: 'aws-org' },
      expect.objectContaining({ enabled: true })
    )
    expect(mockUseVercelRedirectQuery).toHaveBeenCalledWith(
      { installationId: undefined },
      expect.objectContaining({ enabled: false })
    )
  })

  it('does not render a banner for Supabase-managed organizations', () => {
    mockUseSelectedOrganizationQuery.mockReturnValue({
      data: createMockOrganization({
        managed_by: MANAGED_BY.SUPABASE,
      }),
    })

    renderLayout()

    expect(screen.queryByRole('link', { name: 'Manage' })).toBeNull()
    expect(screen.queryByText('This organization is managed via Vercel Marketplace')).toBeNull()
    expect(screen.queryByText('This organization is billed via AWS Marketplace')).toBeNull()
  })

  it('does not fallback to Vercel redirect behavior for unsupported managed_by values', () => {
    mockUseSelectedOrganizationQuery.mockReturnValue({
      data: createMockOrganization({
        managed_by: 'stripe-product' as any,
      }),
    })

    renderLayout()

    expect(screen.queryByRole('link', { name: 'Manage' })).toBeNull()
    expect(mockUseVercelRedirectQuery).toHaveBeenCalledWith(
      { installationId: undefined },
      expect.objectContaining({ enabled: false })
    )
    expect(mockUseAwsRedirectQuery).toHaveBeenCalledWith(
      { organizationSlug: 'abcdefghijklmnopqrst' },
      expect.objectContaining({ enabled: false })
    )
  })
})
