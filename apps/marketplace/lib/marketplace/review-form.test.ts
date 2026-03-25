import { describe, expect, it } from 'vitest'

import { buildReviewDecisionFormData } from './review-form'

describe('review-form utils', () => {
  it('builds form data payload expected by saveListingReviewAction', () => {
    const formData = buildReviewDecisionFormData({
      partnerSlug: 'acme',
      listingId: 12,
      status: 'approved',
      reviewNotes: 'Looks good',
      featured: true,
      categoryIds: [3, 8],
    })

    expect(formData.get('partnerSlug')).toBe('acme')
    expect(formData.get('listingId')).toBe('12')
    expect(formData.get('status')).toBe('approved')
    expect(formData.get('reviewNotes')).toBe('Looks good')
    expect(formData.get('featured')).toBe('on')
    expect(formData.getAll('categoryIds[]')).toEqual(['3', '8'])
  })
})
