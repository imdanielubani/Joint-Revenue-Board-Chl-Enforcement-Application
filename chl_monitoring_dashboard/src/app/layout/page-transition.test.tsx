import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'

const pageOf = async () => (await screen.findByRole('main')).firstElementChild

describe('moving between pages', () => {
  it('starts a new page afresh, so it fades in', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/history')
    await screen.findByRole('heading', { level: 1, name: 'Verification history' })
    const before = await pageOf()

    await router.navigate('/sync')
    await screen.findByRole('heading', { level: 1, name: 'Synchronization' })
    expect(await pageOf()).not.toBe(before)
  })

  it('keeps the page as it is when only a filter or period changes', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    await screen.findByRole('region', { name: 'History register' })
    const before = await pageOf()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Date range' }), '30d')
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'History register' })).toHaveTextContent(
        'Last 30 days',
      ),
    )
    expect(await pageOf()).toBe(before)
  })
})
