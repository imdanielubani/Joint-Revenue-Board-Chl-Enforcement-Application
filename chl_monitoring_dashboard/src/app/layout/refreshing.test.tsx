import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VerificationHistory } from '@/features/history/history.schemas'
import { mockHistoryApi } from '@/mocks/mock-history-api'
import { renderApp, signInAs } from '@/test/render-app'

afterEach(() => vi.restoreAllMocks())

describe('while new figures load', () => {
  it('marks the page busy until the figures for the new period arrive', async () => {
    // The first period answers at once; the next is held until released.
    const getHistory = mockHistoryApi.getHistory.bind(mockHistoryApi)
    let release: (() => void) | undefined
    vi.spyOn(mockHistoryApi, 'getHistory').mockImplementation(async (filters) => {
      if (filters.range !== '30d') return getHistory(filters)
      await new Promise<void>((resolve) => (release = resolve))
      return getHistory(filters)
    })
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    await screen.findByRole('region', { name: 'History register' })
    const main = await screen.findByRole('main')
    expect(main).not.toHaveAttribute('aria-busy')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Date range' }), '30d')

    // The old figures stay on screen, dimmed and marked busy, while the new ones load.
    await expect.poll(() => main.getAttribute('aria-busy'), { timeout: 10_000 }).toBe('true')
    expect(main).toHaveAttribute('data-refreshing')
    expect(screen.getByRole('region', { name: 'History register' })).toBeInTheDocument()

    release?.()
    await expect.poll(() => main.getAttribute('aria-busy'), { timeout: 10_000 }).toBeNull()
    expect(main).not.toHaveAttribute('data-refreshing')
  })

  it('is not busy on a first load, when there is nothing old to show', async () => {
    let held = false
    vi.spyOn(mockHistoryApi, 'getHistory').mockImplementation(() => {
      held = true
      return new Promise<VerificationHistory>(() => {})
    })
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    const main = await screen.findByRole('main')
    await expect.poll(() => held, { timeout: 10_000 }).toBe(true)
    // Loading for the first time: the loading panel shows, nothing is dimmed.
    expect(await screen.findByText('Loading the verification history…')).toBeInTheDocument()
    expect(main).not.toHaveAttribute('aria-busy')
    expect(main).not.toHaveAttribute('data-refreshing')
  })
})
