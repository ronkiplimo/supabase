import { screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { describe, expect, test, vi } from 'vitest'

import {
  AwsMarketplaceOnboardingScreen,
  type AwsMarketplaceOnboardingScreenProps,
} from '@/components/interfaces/Organization/CloudMarketplace/AwsMarketplaceOnboarding'
import type { CloudMarketplaceContractLinkingIneligibilityReason } from '@/components/interfaces/Organization/CloudMarketplace/cloud-marketplace-query'
import type { ProfileContextType } from '@/lib/profile'
import { createMockOrganization } from '@/tests/helpers'
import { customRender } from '@/tests/lib/custom-render'
import { addAPIMock } from '@/tests/lib/msw'
import type { Organization } from '@/types'

// --- Fixtures ---

const DEFAULT_PROFILE_CONTEXT: ProfileContextType = {
  profile: {
    id: 1,
    auth0_id: 'auth0|test',
    gotrue_id: 'gotrue-test',
    username: 'testuser',
    primary_email: 'test@example.com',
    first_name: null,
    last_name: null,
    mobile: null,
    is_alpha_user: false,
    is_sso_user: false,
    disabled_features: [],
    free_project_limit: null,
  },
  error: null,
  isLoading: false,
  isError: false,
  isSuccess: true,
}

const DEFAULT_ORG = createMockOrganization({ name: 'My Org', slug: 'my-org' })

// --- Mock data creators ---

function createMockEligibilityResponse(
  overrides: {
    is_eligible?: boolean
    reasons?: Array<CloudMarketplaceContractLinkingIneligibilityReason>
  } = {}
) {
  return {
    eligibility: {
      is_eligible: true,
      reasons: [] as Array<CloudMarketplaceContractLinkingIneligibilityReason>,
      ...overrides,
    },
  }
}

function createMockOnboardingInfoResponse(linkableOrgSlugs: Array<string> = ['my-org']) {
  return {
    plan_name_selected_on_marketplace: 'Pro',
    aws_contract_auto_renewal: true,
    aws_contract_is_private_offer: false,
    aws_contract_end_date: null,
    aws_contract_settings_url: null,
    organization_linking_eligibility: linkableOrgSlugs.map((slug) => ({
      slug,
      is_eligible: true,
    })),
  }
}

// --- MSW helpers ---

// Both the eligibility query and the organizations query fire for any render with a valid buyerId.
// Since MSW is configured with onUnhandledRequest: 'error', both must always be mocked.

function mockEligibilityEndpoint(response = createMockEligibilityResponse()) {
  addAPIMock({
    method: 'get',
    path: '/platform/cloud-marketplace/buyers/:buyer_id/contract-linking-eligibility',
    response: () => HttpResponse.json(response),
  })
}

function mockOrgsEndpoint(orgs: Array<Organization> = [DEFAULT_ORG]) {
  addAPIMock({
    method: 'get',
    path: '/platform/organizations',
    response: () => HttpResponse.json(orgs),
  })
}

function mockOnboardingInfoEndpoint(response = createMockOnboardingInfoResponse()) {
  addAPIMock({
    method: 'get',
    path: '/platform/cloud-marketplace/buyers/:buyer_id/onboarding-info',
    response: () => HttpResponse.json(response),
  })
}

function mockBothCoreEndpoints(
  eligibilityResponse = createMockEligibilityResponse(),
  orgs: Array<Organization> = [DEFAULT_ORG]
) {
  mockEligibilityEndpoint(eligibilityResponse)
  mockOrgsEndpoint(orgs)
}

// Mocks all three endpoints, including the onboarding info endpoint required by sub-components
function mockAllEndpoints(
  eligibilityResponse = createMockEligibilityResponse(),
  orgs: Array<Organization> = [DEFAULT_ORG],
  linkableOrgSlugs: Array<string> = ['my-org']
) {
  mockEligibilityEndpoint(eligibilityResponse)
  mockOrgsEndpoint(orgs)
  mockOnboardingInfoEndpoint(createMockOnboardingInfoResponse(linkableOrgSlugs))
}

// --- Render helper ---

function renderScreen(props: Partial<AwsMarketplaceOnboardingScreenProps> = {}) {
  const navigate = vi.fn()
  const result = customRender(
    <AwsMarketplaceOnboardingScreen buyerId="test-buyer-id" __routeApi={{ navigate }} {...props} />,
    { profileContext: DEFAULT_PROFILE_CONTEXT }
  )
  return { ...result, navigate }
}

// --- Tests ---

describe('AwsMarketplaceOnboardingScreen', () => {
  describe('page structure', () => {
    test('always renders the AWS Marketplace Setup heading', () => {
      mockOrgsEndpoint()
      addAPIMock({
        method: 'get',
        path: '/platform/cloud-marketplace/buyers/:buyer_id/contract-linking-eligibility',
        response: () => new Promise(() => {}),
      })
      renderScreen()
      expect(screen.getByText('AWS Marketplace Setup')).toBeInTheDocument()
    })
  })

  describe('loading states', () => {
    test('renders skeleton placeholder while organizations are being fetched', () => {
      mockEligibilityEndpoint()
      addAPIMock({
        method: 'get',
        path: '/platform/organizations',
        response: () => new Promise(() => {}),
      })
      const { container } = renderScreen()
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })

    test('renders skeleton placeholder while eligibility data is being fetched', () => {
      mockOrgsEndpoint()
      addAPIMock({
        method: 'get',
        path: '/platform/cloud-marketplace/buyers/:buyer_id/contract-linking-eligibility',
        response: () => new Promise(() => {}),
      })
      const { container } = renderScreen()
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })

  describe('error states', () => {
    test('shows error message when organizations query fails', async () => {
      mockEligibilityEndpoint()
      addAPIMock({
        method: 'get',
        path: '/platform/organizations',
        response: () => HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      })
      renderScreen()
      await screen.findByText('Error loading AWS Marketplace setup page. Try again later.')
    })

    test('shows error message when eligibility query fails', async () => {
      mockOrgsEndpoint()
      addAPIMock({
        method: 'get',
        path: '/platform/cloud-marketplace/buyers/:buyer_id/contract-linking-eligibility',
        response: () => HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      })
      renderScreen()
      await screen.findByText('Error loading AWS Marketplace setup page. Try again later.')
    })
  })

  describe('when not eligible', () => {
    test('shows no-active-contract message for NO_ACTIVE_CONTRACT_FOUND reason', async () => {
      mockBothCoreEndpoints(
        createMockEligibilityResponse({
          is_eligible: false,
          reasons: ['NO_ACTIVE_CONTRACT_FOUND'],
        })
      )
      renderScreen()
      await screen.findByText(/Thanks for purchasing Supabase through the AWS Marketplace/)
    })

    test('shows AWS Activate credits message for AWS_ACTIVATE_CREDITS_DEAL reason', async () => {
      mockBothCoreEndpoints(
        createMockEligibilityResponse({
          is_eligible: false,
          reasons: ['AWS_ACTIVATE_CREDITS_DEAL'],
        })
      )
      renderScreen()
      await screen.findByText(/private offer for Supabase credits as part of AWS Activate/)
    })

    test('shows agreement-based offer message for AGREEMENT_BASED_OFFER reason', async () => {
      mockBothCoreEndpoints(
        createMockEligibilityResponse({
          is_eligible: false,
          reasons: ['AGREEMENT_BASED_OFFER'],
        })
      )
      renderScreen()
      await screen.findByText(
        /private offer that updated or extended an existing Supabase subscription/
      )
    })
  })

  describe('when eligible with existing organizations', () => {
    test('shows link organization form with linkable organizations section', async () => {
      mockAllEndpoints()
      renderScreen()
      await screen.findByText('Organizations that can be linked')
      expect(screen.getByRole('button', { name: 'Link organization' })).toBeInTheDocument()
    })

    test('shows create organization option for starting fresh with a new org', async () => {
      mockAllEndpoints()
      renderScreen()
      await screen.findByText(/Want to start fresh/)
    })

    test('lists organizations eligible for linking', async () => {
      const org1 = createMockOrganization({ id: 1, name: 'Linkable Org', slug: 'linkable-org' })
      const org2 = createMockOrganization({
        id: 2,
        name: 'Not Linkable Org',
        slug: 'not-linkable-org',
      })
      mockAllEndpoints(createMockEligibilityResponse(), [org1, org2], ['linkable-org'])
      renderScreen()
      await screen.findByText('Linkable Org')
    })
  })

  describe('when eligible with no organizations', () => {
    test('shows create new organization form', async () => {
      mockAllEndpoints(createMockEligibilityResponse(), [])
      renderScreen()
      await screen.findByText(/you need to create a Supabase organization/)
      expect(screen.getByRole('button', { name: 'Create organization' })).toBeInTheDocument()
    })
  })
})
