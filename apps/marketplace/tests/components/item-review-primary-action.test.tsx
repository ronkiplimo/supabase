import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/protected/actions', () => ({
  requestListingReviewAction: vi.fn(),
}))

import { ListingReviewPrimaryAction } from '@/components/item-review-primary-action'

const baseProps = {
  listingId: 12,
  listingSlug: 'auth-item',
  partnerSlug: 'acme',
  latestReviewStatus: null,
  latestReviewNotes: null,
  openReviewStatusLabel: null,
}

describe('ListingReviewPrimaryAction', () => {
  it('renders approved badge when item is approved', () => {
    render(<ListingReviewPrimaryAction {...baseProps} isApproved hasOpenReview={false} />)

    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('renders request review button when no review is open', () => {
    render(<ListingReviewPrimaryAction {...baseProps} isApproved={false} hasOpenReview={false} />)

    expect(screen.getByRole('button', { name: 'Request review' })).toBeInTheDocument()
  })

  it('renders open review status badge when review is in progress', () => {
    render(
      <ListingReviewPrimaryAction
        {...baseProps}
        isApproved={false}
        hasOpenReview
        openReviewStatusLabel="Pending review"
      />
    )

    expect(screen.getByText('Pending review')).toBeInTheDocument()
  })
})
