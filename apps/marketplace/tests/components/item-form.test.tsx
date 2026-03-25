import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ListingForm } from '@/components/item-form'

const pushMock = vi.fn()
const createListingDraftActionMock = vi.fn()
const updateListingDraftActionMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: { from: () => ({ list: vi.fn() }) },
  }),
}))

vi.mock('@/components/item-files-uploader', () => ({
  ListingFilesUploader: () => <div data-testid="listing-files-uploader" />,
}))

vi.mock('@/app/protected/actions', () => ({
  createListingDraftAction: (...args: unknown[]) => createListingDraftActionMock(...args),
  updateListingDraftAction: (...args: unknown[]) => updateListingDraftActionMock(...args),
}))

describe('ListingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows creating a template draft without a zip package', async () => {
    const user = userEvent.setup()
    createListingDraftActionMock.mockResolvedValue({
      listingId: 1,
      listingSlug: 'auth-template',
      partnerSlug: 'acme',
    })

    render(<ListingForm mode="create" partner={{ id: 1, slug: 'acme' }} />)

    await user.type(screen.getByPlaceholderText('Authentication starter'), 'Auth Template')
    await user.click(screen.getByRole('button', { name: 'Create listing' }))

    await waitFor(() => expect(createListingDraftActionMock).toHaveBeenCalledTimes(1))
    expect(
      screen.queryByText('Upload a template ZIP package that includes template.json.')
    ).not.toBeInTheDocument()
  })
})
