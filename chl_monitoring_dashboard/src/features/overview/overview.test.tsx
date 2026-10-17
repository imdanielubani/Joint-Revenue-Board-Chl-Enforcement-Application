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

  it('reports on dates the user picks', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')

    await userEvent.selectOptions(await screen.findByLabelText('Date range'), 'custom')
    // The custom range starts from the period already on screen.
    const from = screen.getByLabelText('From')
    const to = screen.getByLabelText('To')
    expect(router.state.location.search).toMatch(/range=custom&from=\d{4}-\d{2}-\d{2}&to=/)

    await userEvent.clear(from)
    await userEvent.type(from, '2026-10-01')
    await userEvent.clear(to)
    await userEvent.type(to, '2026-10-10')
    expect(router.state.location.search).toContain('from=2026-10-01')
    expect(router.state.location.search).toContain('to=2026-10-10')
    expect(await screen.findByText(/National scope · 1–10 Oct, 2026 ·/)).toBeInTheDocument()

    // Dates the wrong way round are explained, not applied.
    await userEvent.clear(from)
    await userEvent.type(from, '2026-10-12')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The start date must be on or before the end date.',
    )
    expect(router.state.location.search).toContain('from=2026-10-01')

    await userEvent.selectOptions(screen.getByLabelText('Date range'), '7d')
    expect(router.state.location.search).not.toMatch(/from=|to=/)
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
  })

  it('falls back to the last 14 days for dates that make no sense', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview?range=custom&from=2026-10-12&to=2026-10-01')
    expect(await screen.findByText(/National scope · Last 14 days/)).toBeInTheDocument()
  })

  it('narrows the page to an area within the user’s own', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Monitoring scope: National overview' }),
    )
    const search = screen.getByRole('combobox', { name: 'Find an area' })
    // The whole tree is listed once it loads, indented under the country.
    expect(await screen.findByRole('option', { name: /Ikeja LGA/ })).toBeInTheDocument()

    await userEvent.type(search, 'ikeja{Enter}')
    expect(router.state.location.search).toContain('scope=la-ikeja')
    expect(await screen.findByText(/Ikeja LGA scope · Last 14 days/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Monitoring scope: Ikeja LGA overview' }),
    ).toHaveFocus()
  })

  it('opens on the area named in the address', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview?scope=loc_ojota')
    expect(await screen.findByText(/Ojota enforcement point scope/)).toBeInTheDocument()
    // A single enforcement point has no other locations to compare.
    const performance = await card('Enforcement performance & corporate monitoring')
    expect(within(performance).getAllByRole('tab')).toHaveLength(1)
  })

  it('ignores an area in the address the user may not see', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/overview?scope=kn')
    expect(await screen.findByText(/Lagos state scope/)).toBeInTheDocument()
  })

  it('filters by organization and agent, and clears them', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')

    await userEvent.selectOptions(await screen.findByLabelText('Organization'), 'Zone 1')
    expect(router.state.location.search).toContain('org=Zone+1')
    expect(await screen.findByText(/Organization: Zone 1/)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Agent'), 'JRB-AG-0142')
    expect(router.state.location.search).toContain('agent=JRB-AG-0142')
    expect(await screen.findByText(/Agent: Tunde Okafor/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(router.state.location.search).not.toMatch(/agent=|org=/)
    expect(screen.getByLabelText('Agent')).toHaveValue('')
  })

  it('ignores an agent or organization in the address the user cannot see', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview?agent=JRB-AG-9999&org=Elsewhere')
    expect(await screen.findByLabelText('Agent')).toHaveValue('')
    expect(screen.getByLabelText('Organization')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
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

  it('marks records checked offline and their sync status', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const recent = await card('Recent activity')
    const rows = await within(recent).findAllByRole('row')
    // Row 4 was checked offline and sent 47 minutes later; row 8 still has evidence to upload.
    expect(within(rows[4]!).getByText('Offline')).toBeInTheDocument()
    expect(within(rows[4]!).getByText('received 47 min later')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Live check')).toBeInTheDocument()
    expect(within(rows[8]!).getByText('Evidence pending')).toBeInTheDocument()

    await userEvent.type(within(recent).getByLabelText('Search records'), 'offline')
    expect(within(recent).getByText('Showing 1–10 of 17 records')).toBeInTheDocument()
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
