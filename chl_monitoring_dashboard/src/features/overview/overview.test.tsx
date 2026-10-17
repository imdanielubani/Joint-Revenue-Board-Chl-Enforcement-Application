import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'

/** One of the page's cards, found by its title. */
const card = (title: string) => screen.findByRole('region', { name: title })

describe('overview page', () => {
  it('shows the headline figures with links into the modules', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const figures = await screen.findByRole('list', { name: 'Headline figures' })
    const total = within(figures).getByText('Total agent verifications').closest('li')!
    expect(within(total).getByText('27')).toBeInTheDocument()
    expect(within(total).getByRole('link')).toHaveAttribute('href', '/verifications')
    expect(within(figures).getByText('4 agents with issued violations')).toBeInTheDocument()
    expect(screen.getByText(/National scope · Last 14 days · 8 reporting/)).toBeInTheDocument()
  })

  it('keeps the chosen period in the address', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')

    await userEvent.selectOptions(await screen.findByLabelText('Date range'), '7d')
    expect(router.state.location.search).toContain('range=7d')
    expect(await screen.findByText(/National scope · Last 7 days/)).toBeInTheDocument()
  })

  it('groups the metrics by agent, location or organization', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const performance = await card('Enforcement performance & corporate monitoring')
    expect(
      await within(performance).findByRole('table', { name: 'Enforcement metrics by agent' }),
    ).toBeInTheDocument()

    await userEvent.click(within(performance).getByRole('tab', { name: /By location/ }))
    const byLocation = within(performance).getByRole('table', {
      name: 'Enforcement metrics by location',
    })
    expect(within(byLocation).getByText('Kano-Zaria Exp')).toBeInTheDocument()

    await userEvent.click(within(performance).getByRole('tab', { name: 'Corporate summary' }))
    const byOrganization = within(performance).getByRole('table', {
      name: 'Enforcement metrics by organization',
    })
    // The four sample agents all belong to Zone 1.
    const [, row] = within(byOrganization).getAllByRole('row')
    expect(
      within(row!)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Zone 1', '4', '27', '30', '15', '7', '3'])
  })

  it('searches, sorts and pages the recent activity register', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const recent = await card('Recent activity')
    expect(await within(recent).findByText('Showing 1–10 of 68 records')).toBeInTheDocument()
    expect(within(recent).getByText('Page 1 / 7')).toBeInTheDocument()

    await userEvent.click(within(recent).getByRole('button', { name: 'Next page' }))
    expect(within(recent).getByText('Showing 11–20 of 68 records')).toBeInTheDocument()

    await userEvent.type(within(recent).getByLabelText('Search records'), 'IBD-640')
    expect(within(recent).getByText('Showing 1–7 of 7 records')).toBeInTheDocument()

    await userEvent.clear(within(recent).getByLabelText('Search records'))
    await userEvent.click(within(recent).getByRole('button', { name: 'Vehicle Plate' }))
    const firstRow = within(recent).getAllByRole('row')[1]!
    expect(within(firstRow).getByText('AAA-001-AB')).toBeInTheDocument()
  })

  it('lists only escalated cases on the Escalated tab', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const cases = await card('Cases requiring attention')
    expect(await within(cases).findByText('KJA-482XY')).toBeInTheDocument()
    await userEvent.click(within(cases).getByRole('tab', { name: /Escalated/ }))
    expect(within(cases).queryByText('Payment Pending')).not.toBeInTheDocument()
    expect(within(cases).getAllByText('Escalated', { selector: 'span' }).length).toBeGreaterThan(1)
  })
})
