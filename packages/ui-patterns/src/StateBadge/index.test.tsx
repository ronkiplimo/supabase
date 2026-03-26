import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StateBadge, type StateBadgeState } from './index'

const stateBadgeExpectations: Array<{
  state: StateBadgeState
  label: string
  tone: 'positive' | 'destructive' | 'neutral'
}> = [
  { state: 'success', label: 'Success', tone: 'positive' },
  { state: 'failure', label: 'Failure', tone: 'destructive' },
  { state: 'pending', label: 'Pending', tone: 'neutral' },
  { state: 'skipped', label: 'Skipped', tone: 'neutral' },
  { state: 'enabled', label: 'Enabled', tone: 'positive' },
  { state: 'disabled', label: 'Disabled', tone: 'neutral' },
  { state: 'unknown', label: 'Unknown', tone: 'neutral' },
]

describe('StateBadge', () => {
  it.each(stateBadgeExpectations)(
    'renders the default $label label for $state',
    ({ state, label }) => {
      render(<StateBadge state={state} />)

      expect(screen.getByText(label)).toBeVisible()
    }
  )

  it.each(stateBadgeExpectations)(
    'applies the expected $tone tone and icon for $state',
    ({ state, label, tone }) => {
      render(<StateBadge state={state} />)

      const root = screen.getByText(label).closest('[data-state]')

      expect(root).toHaveAttribute('data-state', state)
      expect(root).toHaveAttribute('data-tone', tone)
      expect(root?.querySelector('[data-slot="state-badge-icon"] svg')).toBeInTheDocument()
    }
  )

  it('allows children to override the rendered label without changing the semantic styling', () => {
    render(<StateBadge state="pending">Retrying</StateBadge>)

    const root = screen.getByText('Retrying').closest('[data-state]')

    expect(screen.getByText('Retrying')).toBeVisible()
    expect(screen.queryByText('Pending')).not.toBeInTheDocument()
    expect(root).toHaveAttribute('data-state', 'pending')
    expect(root).toHaveAttribute('data-tone', 'neutral')
  })

  it('passes className through to the root and keeps the badge non-wrapping', () => {
    render(<StateBadge state="enabled" className="test-class" />)

    const root = screen.getByText('Enabled').closest('[data-state]')

    expect(root).toHaveClass('test-class')
    expect(root).toHaveClass('whitespace-nowrap')
  })
})
