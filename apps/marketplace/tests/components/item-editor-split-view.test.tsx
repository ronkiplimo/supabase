import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/item-form', () => ({
  ListingForm: () => <div data-testid="listing-form" />,
}))

vi.mock('ui-patterns/MarketplaceItem', () => ({
  MarketplaceItem: () => <div data-testid="marketplace-preview" />,
}))

import { ListingEditorSplitView } from '@/components/item-editor-split-view'

const baseEditProps = {
  mode: 'edit' as const,
  partner: { id: 1, slug: 'acme', title: 'Acme' },
  listing: {
    id: 12,
    slug: 'auth-listing',
    title: 'Auth Listing',
    summary: null,
    content: null,
    published: false,
    type: 'oauth',
    url: 'https://example.com',
    registry_listing_url: null,
    documentation_url: null,
    initiation_action_url: null,
    initiation_action_method: null,
    updated_at: null,
  },
  initialFiles: [] as string[],
}

describe('ListingEditorSplitView', () => {
  it('renders split view form and preview in edit mode', () => {
    render(<ListingEditorSplitView {...baseEditProps} />)

    expect(screen.getByTestId('listing-form')).toBeInTheDocument()
    expect(screen.getByTestId('marketplace-preview')).toBeInTheDocument()
  })
})
