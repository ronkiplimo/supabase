import { act, fireEvent, screen } from '@testing-library/react'
import { render } from 'tests/helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdvisorButton } from './AdvisorButton'
import { ADVISOR_URGENT_PROTOTYPE } from './advisor-urgent-prototype.constants'
import { SIDEBAR_KEYS } from '../ProjectLayout/LayoutSidebar/LayoutSidebarProvider'

const mocks = vi.hoisted(() => ({
  toggleSidebar: vi.fn(),
  activeSidebar: null as { id: string } | null,
  reducedMotion: false,
  viewport: { width: 1280, height: 800 },
}))

vi.mock('common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('common')>()

  return {
    ...(typeof actual === 'object' ? actual : {}),
    useReducedMotion: () => mocks.reducedMotion,
    useViewport: () => mocks.viewport,
  }
})

vi.mock('data/lint/lint-query', () => ({
  useProjectLintsQuery: () => ({ data: [] }),
}))

vi.mock('@/data/notifications/notifications-v2-query', () => ({
  useNotificationsV2Query: () => ({ data: { pages: [[]] } }),
}))

vi.mock('state/sidebar-manager-state', () => ({
  useSidebarManagerSnapshot: () => ({
    toggleSidebar: mocks.toggleSidebar,
    activeSidebar: mocks.activeSidebar,
  }),
}))

describe('AdvisorButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.toggleSidebar.mockReset()
    mocks.activeSidebar = null
    mocks.reducedMotion = false
    mocks.viewport = { width: 1280, height: 800 }
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
  })

  it('starts expanded and then collapses back to an urgent circular state', async () => {
    render(<AdvisorButton projectRef="default" />)

    const button = screen.getByRole('button', {
      name: /advisor center: exceeding usage limits/i,
    })

    expect(button).toHaveAttribute('data-state', 'prototype-expanded')
    expect(screen.getByTestId('advisor-urgent-label-track')).toHaveAttribute(
      'data-marquee',
      'true'
    )

    act(() => {
      vi.advanceTimersByTime(ADVISOR_URGENT_PROTOTYPE.holdMs + 250)
    })

    expect(button).toHaveAttribute('data-state', 'prototype-collapsed')
    expect(screen.queryByTestId('advisor-urgent-label-track')).not.toBeInTheDocument()
    expect(screen.queryByTestId('advisor-status-indicator')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByTestId('advisor-status-indicator')).toBeInTheDocument()
  })

  it('still opens the advisor sidebar while expanded and after it collapses', async () => {
    render(<AdvisorButton projectRef="default" />)

    const button = screen.getByRole('button', {
      name: /advisor center: exceeding usage limits/i,
    })

    fireEvent.click(button)
    expect(mocks.toggleSidebar).toHaveBeenCalledWith(SIDEBAR_KEYS.ADVISOR_PANEL)

    mocks.toggleSidebar.mockClear()

    act(() => {
      vi.advanceTimersByTime(ADVISOR_URGENT_PROTOTYPE.holdMs + 250)
    })

    expect(button).toHaveAttribute('data-state', 'prototype-collapsed')
    fireEvent.click(button)
    expect(mocks.toggleSidebar).toHaveBeenCalledWith(SIDEBAR_KEYS.ADVISOR_PANEL)
  })

  it('disables marquee when reduced motion is enabled', () => {
    mocks.reducedMotion = true

    render(<AdvisorButton projectRef="default" />)

    expect(screen.getByTestId('advisor-urgent-label-track')).toHaveAttribute(
      'data-marquee',
      'false'
    )
  })
})
