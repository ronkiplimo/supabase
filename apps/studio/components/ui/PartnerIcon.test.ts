import { MANAGED_BY } from 'lib/constants/infrastructure'
import { describe, expect, it } from 'vitest'

import { getDefaultPartnerTooltipText, getPartnerTooltipText } from './PartnerIcon'

describe('PartnerIcon tooltip copy', () => {
  it('returns provider-specific default tooltip copy for AWS and Vercel', () => {
    expect(getDefaultPartnerTooltipText(MANAGED_BY.VERCEL_MARKETPLACE)).toBe(
      'Managed via Vercel Marketplace'
    )
    expect(getDefaultPartnerTooltipText(MANAGED_BY.AWS_MARKETPLACE)).toBe(
      'Billed via AWS Marketplace'
    )
  })

  it('uses custom tooltip text when provided', () => {
    expect(
      getPartnerTooltipText({
        managedBy: MANAGED_BY.VERCEL_MARKETPLACE,
        tooltipText: 'Managed by Vercel Marketplace.',
      })
    ).toBe('Managed by Vercel Marketplace.')
  })

  it('falls back to default tooltip text when custom tooltip is not provided', () => {
    expect(
      getPartnerTooltipText({
        managedBy: MANAGED_BY.AWS_MARKETPLACE,
      })
    ).toBe('Billed via AWS Marketplace')
  })
})
