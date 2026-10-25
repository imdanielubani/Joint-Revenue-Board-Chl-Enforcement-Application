import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeGeography } from '@/mocks/mock-geography-api'
import { summarizeViolations } from '@/mocks/mock-violations-api'
import { summarize } from '@/mocks/mock-overview-api'
import { mockRecords } from '@/mocks/mock-records'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}

/** What the page must show for an area: the same records every view counts, last 14 days. */
function expected(scope: string) {
  const today = lagosDay()
  const filters = { scope, range: '14d' as const, ...presetPeriod('14d', today) }
  return {
    overview: summarize(mockRecords(today), { ...filters, agentId: null, organization: null }),
    geography: summarizeGeography(filters),
  }
}

describe('geographical monitoring page', () => {
  it('shows the headline figures for the scope', async () => {
    const { overview } = expected('ng')
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Geographical monitoring' }),
    ).toBeVisible()
    expect(await figure('Verifications')).toHaveTextContent(
      String(overview.kpis.totalVerifications),
    )
    expect(await figure('Agents with activity')).toHaveTextContent(
      String(overview.kpis.agentsWithActivity),
    )
    expect(await figure('Unresolved cases')).toHaveTextContent(
      `${overview.kpis.escalatedViolations} escalated within this total`,
    )
    expect(within(await figure('Verifications')).getByRole('link')).toHaveAttribute(
      'href',
      '/verifications?scope=ng',
    )
  })

  it('offers eight views of the same records, widest first', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const scope = await card('Monitoring scope')
    expect(
      within(scope)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual([
      'National',
      'Region',
      'Subregion',
      'State',
      'Local Government Area',
      'Ward',
      'Enforcement Zone',
      'Enforcement Location',
    ])
    expect(within(scope).getByRole('tab', { name: 'National' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(scope).toHaveTextContent('National (authorized)')
  })

  it('moves to a level and an area, and counts again for it', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const scope = await card('Monitoring scope')
    await userEvent.click(within(scope).getByRole('tab', { name: 'State' }))
    await userEvent.selectOptions(await screen.findByLabelText('State to show'), 'Kano state')

    const inView = await card('Locations in view')
    expect(await within(inView).findByText('Kano state')).toBeInTheDocument()
    expect(await figure('Verifications')).toHaveTextContent(
      String(expected('kn').overview.kpis.totalVerifications),
    )
  })

  it('shows a centrally defined subregion as CHL configures it', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const scope = await card('Monitoring scope')
    await userEvent.click(within(scope).getByRole('tab', { name: 'Subregion' }))
    expect(await screen.findByLabelText('Subregion to show')).toHaveDisplayValue(
      'Lagos Metropolitan subregion',
    )
    expect(await card('Locations in view')).toHaveTextContent('Lagos Metropolitan subregion')
    expect(await figure('Verifications')).toHaveTextContent(
      String(expected('sw-lagos-metro').overview.kpis.totalVerifications),
    )
  })

  it('says when CHL configures no areas at a level within the user’s own', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/geography')
    const scope = await card('Monitoring scope')
    await userEvent.click(within(scope).getByRole('tab', { name: 'Subregion' }))
    expect(scope).toHaveTextContent('CHL has no subregions configured within your areas.')
  })

  it('focuses on a location chosen from the list, keeping the others to choose from', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const inView = await card('Locations in view')
    await userEvent.click(within(inView).getByRole('button', { name: /Apapa Port Rd/ }))

    const focused = await card('Locations in view')
    expect(await within(focused).findByText('Apapa Port Rd', { selector: 'p' })).toBeInTheDocument()
    expect(within(focused).getByRole('button', { name: /Apapa Port Rd/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // The Enforcement Location view still lists every permitted location.
    expect(within(focused).getByRole('button', { name: /Zuba Junction/ })).toBeInTheDocument()
    expect(focused).toHaveTextContent('6 of 6 permitted locations')
    // The scope is named; its figures are not repeated here.
    expect(focused).not.toHaveTextContent('Unresolved')
  })

  it('lists the underlying records for the scope, by kind', async () => {
    const { geography } = expected('la')
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    expect(within(records).getByRole('tab', { name: /^Verifications/ })).toHaveTextContent(
      String(geography.records.verifications.length),
    )
    expect(within(records).getByRole('table', { name: 'Verifications' })).toBeInTheDocument()

    await userEvent.click(within(records).getByRole('tab', { name: /^Payments/ }))
    const table = within(records).getByRole('table', { name: 'Payments' })
    const first = geography.records.notices[0]
    if (first) expect(within(table).getByText(first.id)).toBeInTheDocument()
  })

  it('shows the GPS recorded with each event, and can draw it on the map', async () => {
    const { geography } = expected('la')
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    const table = within(records).getByRole('table', { name: 'Verifications' })
    expect(within(table).getByRole('columnheader', { name: 'Recorded GPS' })).toBeInTheDocument()
    const first = geography.records.verifications[0]!
    const row = within(table).getByText(first.reference).closest('tr')!
    expect(row).toHaveTextContent(
      first.position
        ? `${first.position.lat.toFixed(5)}, ${first.position.lng.toFixed(5)}`
        : 'Not captured',
    )

    const footprint = await card('Enforcement footprint')
    const toggle = within(footprint).getByRole('button', { name: 'Event GPS' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(footprint).toHaveTextContent(
      `Recorded event GPS · ${geography.records.verifications.filter((record) => record.position).length} verifications`,
    )
  })

  it('opens any underlying record on the page, with what it is linked to', async () => {
    const { geography } = expected('la')
    const violation = geography.records.violations.find((entry) => entry.noticeId)!
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    await userEvent.click(within(records).getByRole('tab', { name: /^Violations/ }))
    await userEvent.click(within(records).getByRole('button', { name: violation.id }))

    const panel = within(records).getByRole('region', { name: violation.id })
    expect(panel).toHaveTextContent(violation.category)
    expect(panel).toHaveTextContent(`${violation.noticeId} ·`)
    expect(panel).toHaveTextContent(violation.verificationReference)
    expect(within(panel).getByRole('link', { name: /Open the case/ })).toHaveAttribute(
      'href',
      `/violations?case=${violation.id}`,
    )
    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(within(records).queryByRole('region', { name: violation.id })).not.toBeInTheDocument()

    await userEvent.click(within(records).getByRole('tab', { name: /^Evidence/ }))
    const table = within(records).getByRole('table', { name: 'Evidence' })
    expect(within(table).getAllByRole('row')).toHaveLength(
      Math.min(geography.records.evidence.length, 10) + 1,
    )
  })

  it('opens a verification record’s verification, vehicle and agent in popups on the page', async () => {
    const { geography } = expected('la')
    const record = geography.records.verifications[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    const table = within(records).getByRole('table', { name: 'Verifications' })
    const actions = within(table).getByRole('button', { name: `Actions for ${record.reference}` })

    await userEvent.click(actions)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View verification' }))
    expect(await screen.findByRole('dialog', { name: 'Verification details' })).toHaveTextContent(
      record.reference,
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await userEvent.click(actions)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View vehicle history' }))
    expect(await screen.findByRole('dialog', { name: 'Vehicle verifications' })).toHaveTextContent(
      record.plate,
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await userEvent.click(actions)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View agent' }))
    expect(await screen.findByRole('dialog', { name: 'Agent details' })).toHaveTextContent(
      record.agent.id,
    )
    expect(router.state.location.pathname).toBe('/geography')
  })

  it('opens an agent from the underlying records in a popup on the page', async () => {
    const { overview } = expected('la')
    const agent = overview.agents[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    await userEvent.click(within(records).getByRole('tab', { name: /^Agents/ }))
    const table = within(records).getByRole('table', { name: 'Agents' })
    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${agent.name}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View agent' }))
    expect(await screen.findByRole('dialog', { name: 'Agent details' })).toHaveTextContent(
      agent.agentId,
    )
    expect(router.state.location.pathname).toBe('/geography')
  })

  it('opens a violation’s case in a popup on the page, from every violations tab', async () => {
    const { overview, geography } = expected('la')
    const open = new Set(overview.cases.items.map((item) => item.id))
    const escalated = geography.records.violations.find(
      (entry) => open.has(entry.id) && entry.status === 'escalated',
    )
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    for (const [tab, violation] of [
      ['Violations', geography.records.violations[0]!],
      ['Unresolved', geography.records.violations.find((entry) => open.has(entry.id))!],
      ...(escalated ? ([['Escalated', escalated]] as const) : []),
    ] as const) {
      await userEvent.click(within(records).getByRole('tab', { name: new RegExp(`^${tab}`) }))
      const table = within(records).getByRole('table', { name: tab })
      await userEvent.click(
        within(table).getByRole('button', { name: `Actions for ${violation.id}` }),
      )
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Open the case' }))
      expect(await screen.findByRole('dialog', { name: `Case ${violation.id}` })).toHaveTextContent(
        violation.category,
      )
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    }
    expect(router.state.location.pathname).toBe('/geography')
  })

  it('lists a repeat vehicle’s reports in a popup on the page, each opening its case in place', async () => {
    const { overview } = expected('la')
    const vehicle = overview.repeatVehicles.items[0]!
    const cases = summarizeViolations({
      scope: 'la',
      range: '14d',
      ...presetPeriod('14d', lagosDay()),
      agentId: null,
      organization: null,
    }).cases.filter((item) => item.plate === vehicle.plate)
    // Every report the alert counts is one of the plate’s violations.
    expect(cases.filter((item) => item.status !== 'cancelled')).toHaveLength(vehicle.reports)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    await userEvent.click(within(records).getByRole('tab', { name: /^Repeat alerts/ }))
    const table = within(records).getByRole('table', { name: 'Repeat alerts' })
    await userEvent.click(
      within(table).getByRole('button', { name: `Actions for ${vehicle.plate}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View vehicle reports' }))

    const dialog = await screen.findByRole('dialog', { name: 'Vehicle reports' })
    expect(dialog).toHaveTextContent(vehicle.plate)
    const list = within(dialog).getByRole('table', { name: `Violations of ${vehicle.plate}` })
    expect(within(list).getAllByRole('row')).toHaveLength(Math.min(5, cases.length) + 1)

    const first = cases[0]!
    await userEvent.click(within(list).getByRole('button', { name: `Actions for ${first.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View case' }))
    expect(await screen.findByRole('dialog', { name: `Case ${first.id}` })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(router.state.location.pathname).toBe('/geography')
  })

  it('opens a payment record’s demand notice in a popup on the page', async () => {
    const { geography } = expected('la')
    const notice = geography.records.notices[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/geography?scope=la')
    const records = await card('Underlying records')
    await userEvent.click(within(records).getByRole('tab', { name: /^Payments/ }))
    const table = within(records).getByRole('table', { name: 'Payments' })
    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${notice.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open the payment' }))
    const dialog = await screen.findByRole('dialog', { name: `Demand notice ${notice.id}` })
    expect(dialog).toHaveTextContent(notice.plate)
    expect(router.state.location.pathname).toBe('/geography')
  })

  it('lists agent activity in the underlying records, and calls a verification’s outcome its result', async () => {
    const { overview } = expected('ng')
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    expect(screen.queryByRole('region', { name: 'Agent activity' })).not.toBeInTheDocument()

    const records = await card('Underlying records')
    const verifications = within(records).getByRole('table', { name: 'Verifications' })
    expect(
      within(verifications).getByRole('columnheader', { name: 'Verification result' }),
    ).toBeInTheDocument()
    expect(within(verifications).queryByRole('columnheader', { name: 'Outcome' })).toBeNull()
    // The verification method as the Overview's register shows it.
    expect(
      within(verifications).getByRole('columnheader', { name: 'Verification method' }),
    ).toBeInTheDocument()
    // The plate alone, without its location.
    expect(within(verifications).getByRole('columnheader', { name: 'Plate' })).toBeInTheDocument()
    const first = expected('ng').geography.records.verifications[0]!
    const row = within(verifications).getByText(first.reference).closest('tr')!
    expect(row.querySelectorAll('td')[1]).toHaveTextContent(new RegExp(`^${first.plate}$`))

    await userEvent.click(within(records).getByRole('tab', { name: /^Agents/ }))
    const agents = within(records).getByRole('table', { name: 'Agents' })
    for (const agent of overview.agents) {
      expect(within(agents).getByRole('button', { name: agent.name })).toBeInTheDocument()
    }
  })

  it('keeps payment received apart from trip activation', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const payments = await card('Payment follow-up')
    expect(payments).toHaveTextContent('Trip activation recorded')
    expect(payments).toHaveTextContent('Payment received and trip activated are distinct outcomes')
  })

  it('shows enforcement follow-up as the Overview shows cases requiring attention', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography?scope=ng')
    const { overview } = expected('ng')
    const followUp = await card('Enforcement follow-up')
    expect(within(followUp).getByRole('tab', { name: /^Unresolved/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(followUp).getByRole('tab', { name: /^Escalated/ })).toBeInTheDocument()
    expect(followUp).toHaveTextContent(
      `${overview.kpis.unresolvedViolations} unresolved of ${overview.kpis.violationsIssued}`,
    )
    expect(followUp).toHaveTextContent(/repeat alerts? needs? follow-up/)
    expect(within(followUp).getByRole('link', { name: 'View all cases' })).toHaveAttribute(
      'href',
      expect.stringContaining('scope=ng'),
    )
  })

  it('keeps national visibility to authorized users', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/geography?scope=ng')
    const scope = await card('Monitoring scope')
    expect(within(scope).getByRole('tab', { name: 'State' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await userEvent.click(within(scope).getByRole('tab', { name: 'National' }))
    expect(scope).toHaveTextContent('Consolidated national visibility is for authorized users')
  })
})
