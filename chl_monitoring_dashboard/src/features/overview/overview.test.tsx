import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { summarize } from '@/mocks/mock-overview-api'
import { mockRecords } from '@/mocks/mock-records'
import { summarizeViolations } from '@/mocks/mock-violations-api'
import { addDays, formatPeriod, lagosDay } from '@/shared/lib/dates'
import { formatDelay, formatShortDateTime } from '@/shared/lib/format'
import { renderApp, signInAs } from '@/test/render-app'
import { plural } from './overview-display'
import { presetPeriod } from './overview-period'
import type { OverviewFilters, PresetRange } from './overview.schemas'

/** One of the page's cards, found by its title. */
const card = (title: string) => screen.findByRole('region', { name: title })

/** What the sample data should show for these filters: the figures the page must match. */
function expected(
  overrides: Partial<Omit<OverviewFilters, 'range'>> & { range?: PresetRange } = {},
) {
  const today = lagosDay()
  const range = overrides.range ?? '14d'
  return summarize(mockRecords(today), {
    scope: 'ng',
    agentId: null,
    organization: null,
    ...presetPeriod(range, today),
    ...overrides,
    range,
  })
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

describe('overview page', () => {
  it('shows the headline figures with links into the modules', async () => {
    const sample = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const figures = await screen.findByRole('list', { name: 'Headline figures' })
    const total = within(figures).getByText('Total agent verifications').closest('li')!
    expect(within(total).getByText(String(sample.kpis.totalVerifications))).toBeInTheDocument()
    expect(within(total).getByRole('link')).toHaveAttribute('href', '/verifications')
    expect(
      within(figures).getByText(
        `${plural(sample.kpis.agentsWithViolations, 'agent')} with issued violations`,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(`National scope · Last 14 days · ${sample.reportingLocations} reporting`),
      ),
    ).toBeInTheDocument()
  })

  it('counts the figures again for each area, period, organization and agent', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const figures = await screen.findByRole('list', { name: 'Headline figures' })
    const total = () => within(figures).getByText('Total agent verifications').closest('li')!

    await userEvent.selectOptions(screen.getByLabelText('Date range'), '90d')
    const ninety = expected({ range: '90d' })
    expect(
      await within(total()).findByText(String(ninety.kpis.totalVerifications)),
    ).toBeInTheDocument()

    await userEvent.selectOptions(await screen.findByLabelText('Organization'), 'Zone 2')
    const zone2 = expected({ range: '90d', organization: 'Zone 2' })
    expect(
      await within(total()).findByText(String(zone2.kpis.totalVerifications)),
    ).toBeInTheDocument()
    expect(zone2.kpis.totalVerifications).toBeLessThan(ninety.kpis.totalVerifications)

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await userEvent.click(screen.getByRole('button', { name: /^Monitoring scope/ }))
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Find an area' }),
      'lagos state{Enter}',
    )
    const lagos = expected({ range: '90d', scope: 'la' })
    expect(
      await within(total()).findByText(String(lagos.kpis.totalVerifications)),
    ).toBeInTheDocument()
    expect(lagos.kpis.totalVerifications).toBeLessThan(ninety.kpis.totalVerifications)
  })

  it('keeps the chosen period in the address', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')

    await userEvent.selectOptions(await screen.findByLabelText('Date range'), '7d')
    expect(router.state.location.search).toContain('range=7d')
    expect(await screen.findByText(/National scope · Last 7 days/)).toBeInTheDocument()
  })

  it('reports on dates the user picks', async () => {
    const today = lagosDay()
    const from = addDays(today, -17)
    const to = addDays(today, -8)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')

    await userEvent.selectOptions(await screen.findByLabelText('Date range'), 'custom')
    // The custom range starts from the period already on screen.
    const fromField = screen.getByLabelText('From')
    const toField = screen.getByLabelText('To')
    expect(router.state.location.search).toMatch(/range=custom&from=\d{4}-\d{2}-\d{2}&to=/)

    await userEvent.clear(fromField)
    await userEvent.type(fromField, from)
    await userEvent.clear(toField)
    await userEvent.type(toField, to)
    expect(router.state.location.search).toContain(`from=${from}`)
    expect(router.state.location.search).toContain(`to=${to}`)
    expect(
      await screen.findByText(new RegExp(`National scope · ${formatPeriod(from, to)} ·`)),
    ).toBeInTheDocument()

    // Dates the wrong way round are explained, not applied.
    await userEvent.clear(fromField)
    await userEvent.type(fromField, addDays(to, 2))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The start date must be on or before the end date.',
    )
    expect(router.state.location.search).toContain(`from=${from}`)

    await userEvent.selectOptions(screen.getByLabelText('Date range'), '7d')
    expect(router.state.location.search).not.toMatch(/from=|to=/)
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
  })

  it('says when field data last reached CHL, apart from when the page checked', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const received = await screen.findByText(/Field data received/)
    expect(received).not.toHaveTextContent('may be delayed')
    expect(screen.getByText(/Last checked \d{2}:\d{2} WAT/)).toBeInTheDocument()
  })

  it('warns that field data may be delayed when the latest record is old', async () => {
    const today = lagosDay()
    const from = addDays(today, -40)
    const to = addDays(today, -20)
    const latest = summarize(mockRecords(today), {
      scope: 'ng',
      range: 'custom',
      from,
      to,
      agentId: null,
      organization: null,
    }).latestReceivedAt
    signInAs('admin@jrb.gov.ng')
    // A period that ended weeks ago: its latest record is old.
    renderApp(`/overview?range=custom&from=${from}&to=${to}`)
    const received = await screen.findByText(/Field data received/)
    expect(received).toHaveTextContent(
      `Field data received ${formatShortDateTime(latest)} · may be delayed`,
    )
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
    // Only Zone 1's agents are offered.
    expect(
      within(screen.getByLabelText('Agent'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['All agents', 'Tunde Okafor · JRB-AG-0142', 'Grace Bello · JRB-AG-0143'])

    await userEvent.selectOptions(screen.getByLabelText('Agent'), 'JRB-AG-0142')
    expect(router.state.location.search).toContain('agent=JRB-AG-0142')
    expect(await screen.findByText(/Agent: Tunde Okafor/)).toBeInTheDocument()

    // Another organization drops an agent who is not in it.
    await userEvent.selectOptions(screen.getByLabelText('Organization'), 'Zone 2')
    expect(router.state.location.search).not.toContain('agent=')

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
    const sample = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const performance = await card('Enforcement performance & corporate monitoring')
    const byAgent = await within(performance).findByRole('table', {
      name: 'Enforcement metrics by agent',
    })
    expect(within(byAgent).getAllByRole('row')).toHaveLength(sample.agents.length + 1)

    await userEvent.click(within(performance).getByRole('tab', { name: /By location/ }))
    const byLocation = within(performance).getByRole('table', {
      name: 'Enforcement metrics by location',
    })
    for (const location of sample.locations) {
      expect(within(byLocation).getByText(location.name)).toBeInTheDocument()
    }

    await userEvent.click(within(performance).getByRole('tab', { name: 'Corporate summary' }))
    const byOrganization = within(performance).getByRole('table', {
      name: 'Enforcement metrics by organization',
    })
    // Each organization's row adds up its agents' figures.
    const zone1 = sample.agents.filter((agent) => agent.organization === 'Zone 1')
    const sum = (
      key: 'verifications' | 'violationsIssued' | 'unresolved' | 'escalated' | 'repeatAlerts',
    ) => String(zone1.reduce((total, agent) => total + agent[key], 0))
    const row = within(byOrganization).getByText('Zone 1').closest('tr')!
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      'Zone 1',
      String(zone1.length),
      sum('verifications'),
      sum('violationsIssued'),
      sum('unresolved'),
      sum('escalated'),
      sum('repeatAlerts'),
    ])
  })

  it('searches, sorts and pages the recent activity register', async () => {
    const records = expected().recentActivity
    const plate = records[0]!.plate
    const withPlate = records.filter((record) => record.plate === plate).length
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const recent = await card('Recent activity')
    expect(
      await within(recent).findByText(`Showing 1–10 of ${records.length} records`),
    ).toBeInTheDocument()
    expect(
      within(recent).getByText(`Page 1 / ${Math.ceil(records.length / 10)}`),
    ).toBeInTheDocument()

    await userEvent.click(within(recent).getByRole('button', { name: 'Next page' }))
    expect(within(recent).getByText(/^Showing 11–/)).toBeInTheDocument()

    await userEvent.type(within(recent).getByLabelText('Search records'), plate)
    expect(
      within(recent).getByText(`Showing 1–${Math.min(10, withPlate)} of ${withPlate} records`),
    ).toBeInTheDocument()

    await userEvent.clear(within(recent).getByLabelText('Search records'))
    await userEvent.click(within(recent).getByRole('button', { name: 'Vehicle Plate' }))
    const first = [...records].sort((a, b) => collator.compare(a.plate, b.plate))[0]!.plate
    const firstRow = within(recent).getAllByRole('row')[1]!
    expect(within(firstRow).getByText(first)).toBeInTheDocument()
  })

  it('opens a recent record’s verification, vehicle and agent in popups on the page', async () => {
    const record = expected().recentActivity[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')
    const recent = await card('Recent activity')
    const actions = await within(recent).findByRole('button', {
      name: `Actions for ${record.plate}, ${record.reference}`,
    })

    await userEvent.click(actions)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View verification' }))
    const verification = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(verification).toHaveTextContent(record.reference)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await userEvent.click(actions)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View vehicle history' }))
    const vehicle = await screen.findByRole('dialog', { name: 'Vehicle verifications' })
    expect(vehicle).toHaveTextContent(record.plate)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await userEvent.click(actions)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View agent' }))
    const agent = await screen.findByRole('dialog', { name: 'Agent details' })
    expect(agent).toHaveTextContent(record.agent.id)
    expect(router.state.location.pathname).toBe('/overview')
  })

  it('opens an agent’s details from the metrics by agent, without leaving the page', async () => {
    const row = expected().agents[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')
    const performance = await card('Enforcement performance & corporate monitoring')
    await userEvent.click(
      await within(performance).findByRole('button', { name: `Actions for ${row.name}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View agent' }))
    const agent = await screen.findByRole('dialog', { name: 'Agent details' })
    expect(agent).toHaveTextContent(row.agentId)
    expect(router.state.location.pathname).toBe('/overview')
  })

  it('lists the violations an agent issued in a popup, each opening its case in place', async () => {
    const row = expected().agents.find((agent) => agent.violationsIssued > 0)!
    const cases = summarizeViolations({
      scope: 'ng',
      range: '14d',
      ...presetPeriod('14d', lagosDay()),
      agentId: row.agentId,
      organization: null,
    }).cases
    // The popup lists the same violations the agent's row counts.
    expect(cases).toHaveLength(row.violationsIssued)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')
    const performance = await card('Enforcement performance & corporate monitoring')
    await userEvent.click(
      await within(performance).findByRole('button', { name: `Actions for ${row.name}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View violations issued' }))

    const dialog = await screen.findByRole('dialog', { name: 'Violations issued' })
    expect(dialog).toHaveTextContent(row.agentId)
    const table = within(dialog).getByRole('table', { name: `Violations issued by ${row.name}` })
    expect(within(table).getAllByRole('row')).toHaveLength(Math.min(5, cases.length) + 1)

    const first = cases[0]!
    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${first.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View case' }))
    expect(await screen.findByRole('dialog', { name: `Case ${first.id}` })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(router.state.location.pathname).toBe('/overview')
  })

  it('marks records checked offline and their sync status', async () => {
    const records = expected().recentActivity
    const offline = records.filter((record) => record.source === 'offline')
    const example = offline[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const recent = await card('Recent activity')
    await within(recent).findByText(/^Showing 1–/)
    await userEvent.type(within(recent).getByLabelText('Search records'), 'offline')
    expect(
      within(recent).getByText(
        `Showing 1–${Math.min(10, offline.length)} of ${offline.length} records`,
      ),
    ).toBeInTheDocument()

    await userEvent.clear(within(recent).getByLabelText('Search records'))
    await userEvent.type(within(recent).getByLabelText('Search records'), example.reference)
    const row = within(recent).getAllByRole('row')[1]!
    expect(within(row).getByText('Offline')).toBeInTheDocument()
    expect(
      within(row).getByText(`received ${formatDelay(example.recordedAt, example.receivedAt!)}`),
    ).toBeInTheDocument()
    expect(
      within(row).getByText(
        example.syncStatus === 'evidence_pending' ? 'Evidence pending' : 'Synced',
      ),
    ).toBeInTheDocument()
  })

  it('says how many verification attempts completed and how many could not', async () => {
    const { attempts } = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const activity = await card('Verification activity')
    const completed = within(activity).getByText('Completed').closest('div')!
    const notCompleted = within(activity).getByText('Could not complete').closest('div')!
    expect(completed).toHaveTextContent(`Completed${attempts.completed}`)
    expect(notCompleted).toHaveTextContent(`Could not complete${attempts.notCompleted}`)
  })

  it('shows E-Tag results, valid tags included, apart from the outcomes', async () => {
    const { etagResults } = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const results = await screen.findByRole('region', { name: 'E-Tag results' })
    const checks = etagResults.reduce((sum, item) => sum + item.count, 0)
    expect(
      within(results).getByText(`${checks} tag check${checks === 1 ? '' : 's'}`),
    ).toBeInTheDocument()
    for (const [label, result] of [
      ['Valid E-Tag', 'valid'],
      ['Missing E-Tag', 'missing'],
      ['Invalid / fake E-Tag', 'invalid'],
      ['Tag-vehicle mismatch', 'mismatch'],
    ] as const) {
      const link = within(results).getByRole('link', { name: new RegExp(label) })
      expect(link).toHaveAttribute('href', `/verifications?etag=${result}`)
      expect(link).toHaveTextContent(
        String(etagResults.find((item) => item.result === result)?.count),
      )
    }
  })

  it('lists only escalated cases on the Escalated tab', async () => {
    const { cases } = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const card_ = await card('Cases requiring attention')
    expect(await within(card_).findByText(cases.items[0]!.id)).toBeInTheDocument()
    await userEvent.click(within(card_).getByRole('tab', { name: /Escalated/ }))
    const panel = within(card_).getByRole('tabpanel')
    const escalated = cases.items.filter((item) => item.status === 'escalated').slice(0, 4)
    expect(within(panel).getAllByRole('listitem')).toHaveLength(escalated.length)
    for (const item of escalated) {
      expect(within(panel).getByText(item.id)).toBeInTheDocument()
    }
  })
})
