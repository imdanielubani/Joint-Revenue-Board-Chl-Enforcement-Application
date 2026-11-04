import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Overview } from '@/features/overview/overview.schemas'
import { mockOverviewApi } from '@/mocks/mock-overview-api'
import { renderApp, signInAs } from '@/test/render-app'

afterEach(() => vi.restoreAllMocks())

describe('the overview while it loads', () => {
  it('shows the page’s shape, telling screen readers it is loading', async () => {
    // Held: the overview is still loading.
    vi.spyOn(mockOverviewApi, 'getOverview').mockImplementation(
      () => new Promise<Overview>(() => {}),
    )
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const status = await screen.findByText('Loading the overview…')
    const skeleton = status.closest('[aria-busy="true"]')!
    expect(skeleton).toHaveAttribute('role', 'status')
    // The grey shapes are there, hidden from screen readers.
    const shapes = skeleton.querySelector('[aria-hidden="true"]')!
    expect(shapes.childElementCount).toBeGreaterThan(4)
    expect(
      within(skeleton as HTMLElement).queryByRole('list', { name: 'Headline figures' }),
    ).toBeNull()
    // The banner and filters are real already.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
  })

  it('gives way to the figures once they arrive', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    expect(await screen.findByRole('list', { name: 'Headline figures' })).toBeInTheDocument()
    expect(screen.queryByText('Loading the overview…')).toBeNull()
  })
})
