import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { outcomeLabel } from '@/features/overview/overview-display'
import { presetPeriod } from '@/features/overview/overview-period'
import { agentActivity, summarizeAgents } from '@/mocks/mock-agents-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'
import { totalsOf } from './agents-display'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}

const period = (scope: string) => ({
  scope,
  range: '14d' as const,
  ...presetPeriod('14d', lagosDay()),
})

/** What the page must show for an area: the same records every view counts, last 14 days. */
const expected = (scope: string) => summarizeAgents(period(scope))

/** One agent's records in the area, last 14 days. */
const expectedActivity = (agentId: string, scope = 'ng') => agentActivity(agentId, period(scope))

/** The rows on a register's first page, header row left out. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)

describe('agents and organizations page', () => {
  it('adds up the agents in view in the headline figures', async () => {
    const totals = totalsOf(expected('ng').agents)
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Agents & organizations' }),
    ).toBeVisible()
    expect(await figure('Agents in view')).toHaveTextContent(String(totals.agents))
    expect(await figure('Agents in view')).toHaveTextContent(
      `${totals.active} with recorded activity`,
    )
    expect(await figure('Verifications')).toHaveTextContent(String(totals.verifications))
    expect(await figure('Unresolved cases')).toHaveTextContent(
      `${totals.escalated} escalated within this total`,
    )
    expect(within(await figure('Verifications')).getByRole('link')).toHaveAttribute(
      'href',
      '/verifications?scope=ng',
    )
  })

  it('lists each agent’s identity, assigned scope and recorded activity, never a score', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents')
    const register = await card('Agent register')
    const table = within(register).getByRole('table', { name: 'Agents' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Agent',
      'Organization',
      'Assigned scope',
      'Verifications',
      'Violations',
      'Unresolved',
      'Last recorded (WAT)',
      'Actions',
    ])
    for (const agent of expected('ng').agents) {
      const row = within(table).getByRole('button', { name: agent.name }).closest('tr')!
      expect(row).toHaveTextContent(agent.id)
      expect(row).toHaveTextContent(agent.organization ?? 'Not recorded')
      expect(row.querySelectorAll('td')[3]).toHaveTextContent(String(agent.metrics.verifications))
    }
    const tunde = within(table).getByRole('button', { name: 'Tunde Okafor' }).closest('tr')!
    expect(tunde).toHaveTextContent('Ikeja LGA')
    // CHL does not expose Ada Nwosu's scope: it is said, not guessed.
    const ada = within(table).getByRole('button', { name: 'Ada Nwosu' }).closest('tr')!
    expect(ada).toHaveTextContent('Not exposed by CHL')
  })

  it('never orders agents by their figures', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents')
    const table = within(await card('Agent register')).getByRole('table', { name: 'Agents' })
    for (const figure of ['Verifications', 'Violations', 'Unresolved']) {
      const header = within(table).getByRole('columnheader', { name: figure })
      expect(within(header).queryByRole('button')).toBeNull()
      expect(header).not.toHaveAttribute('aria-sort')
    }
    for (const identity of ['Agent', 'Organization', 'Assigned scope']) {
      const header = within(table).getByRole('columnheader', { name: identity })
      expect(within(header).getByRole('button', { name: identity })).toBeInTheDocument()
    }
  })

  it('opens an agent’s identity and documented metrics, and closes them', async () => {
    const tunde = expected('ng').agents.find((agent) => agent.id === 'JRB-AG-0142')!
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents')
    const register = await card('Agent register')
    await userEvent.click(within(register).getByRole('button', { name: 'Tunde Okafor' }))

    const identity = await card('Agent identity')
    expect(identity).toHaveTextContent('JRB-AG-0142')
    expect(identity).toHaveTextContent('Zone 1')
    expect(identity).toHaveTextContent('Ikeja LGA')
    const performance = await card('Performance overview')
    expect(performance).toHaveTextContent(`Verifications${tunde.metrics.verifications}`)
    expect(performance).toHaveTextContent(`Violations issued${tunde.metrics.violationsIssued}`)
    expect(performance).toHaveTextContent(`Demand notices${tunde.metrics.demandNotices.issued}`)
    expect(performance).toHaveTextContent('Agent performance scoring is a future extension')
    expect(within(register).getByRole('button', { name: 'Tunde Okafor' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Show all agents' }))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Agent identity' })).not.toBeInTheDocument(),
    )
  })

  it('opens the agent named in the address, and says so when they are not in the area', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents?agent=JRB-AG-0145')
    const identity = await card('Agent identity')
    expect(identity).toHaveTextContent('Ada Nwosu')
    expect(identity).toHaveTextContent('Not exposed by CHL')
  })

  it('says when the chosen agent has nothing in the area', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents?agent=JRB-AG-0142&scope=kn')
    expect(
      await screen.findByText(/Tunde Okafor has no assignment or recorded activity in Kano state/),
    ).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Agent identity' })).not.toBeInTheDocument()
  })

  it('narrows the page to one organization’s agents', async () => {
    const zone2 = expected('ng').agents.filter((agent) => agent.organization === 'Zone 2')
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents')
    const organizations = await card('Organizations')
    await userEvent.click(within(organizations).getByRole('button', { name: 'Zone 2' }))

    await waitFor(async () =>
      expect(await figure('Agents in view')).toHaveTextContent(String(zone2.length)),
    )
    const register = await card('Agent register')
    for (const agent of zone2) {
      expect(within(register).getByRole('button', { name: agent.name })).toBeInTheDocument()
    }
    expect(within(register).queryByRole('button', { name: 'Tunde Okafor' })).toBeNull()
    expect(within(organizations).getByRole('button', { name: 'Zone 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
  it('lists the agent’s verification records and filters them by result', async () => {
    const { records } = expectedActivity('JRB-AG-0142')
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents?agent=JRB-AG-0142')
    const activity = await card('Verification activity')
    const table = within(activity).getByRole('table', { name: 'Verification records' })
    expect(bodyRows(table)).toHaveLength(Math.min(records.verifications.length, 10))
    // Every record is the agent's: no agent column.
    expect(within(table).queryByRole('columnheader', { name: /^Agent/ })).toBeNull()

    const [first] = records.verifications
    const result = first!.result!
    const results = within(activity).getByRole('group', { name: 'Verification results' })
    const chip = within(results)
      .getAllByRole('button')
      .find((button) => button.textContent?.startsWith(outcomeLabel(result)))!
    await userEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    const matching = records.verifications.filter((record) => record.result === result)
    const filtered = within(activity).getByRole('table', { name: 'Verification records' })
    expect(bodyRows(filtered)).toHaveLength(Math.min(matching.length, 10))

    await userEvent.click(within(filtered).getByRole('button', { name: first!.reference }))
    expect(within(activity).getByRole('heading', { name: first!.reference })).toBeVisible()
  })

  it('shows the violations the agent issued with their action status, their notices and evidence', async () => {
    const { records } = expectedActivity('JRB-AG-0142')
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents?agent=JRB-AG-0142')
    const enforcement = await card('Enforcement activity')
    expect(within(enforcement).getByRole('tab', { name: /^Violations issued/ })).toHaveTextContent(
      String(records.violations.length),
    )
    expect(enforcement).toHaveTextContent('Action status')
    const violations = within(enforcement).getByRole('table', { name: 'Violations issued' })
    expect(bodyRows(violations)).toHaveLength(Math.min(records.violations.length, 10))

    await userEvent.click(within(enforcement).getByRole('tab', { name: /^Demand notices/ }))
    const notices = within(enforcement).getByRole('table', { name: 'Demand notices' })
    expect(bodyRows(notices)).toHaveLength(Math.min(records.notices.length, 10))

    await userEvent.click(within(enforcement).getByRole('tab', { name: /^Evidence submitted/ }))
    const evidence = within(enforcement).getByRole('table', { name: 'Evidence submitted' })
    expect(bodyRows(evidence)).toHaveLength(Math.min(records.evidence.length, 10))
  })
  it('shows where the agent recorded activity and what still needs follow-up', async () => {
    const { locations, cases, repeatVehicles } = expectedActivity('JRB-AG-0142')
    signInAs('admin@jrb.gov.ng')
    renderApp('/agents?agent=JRB-AG-0142')

    expect(await card('Activity by location')).toBeVisible()
    const recorded = await card('Locations recorded')
    for (const location of locations) expect(recorded).toHaveTextContent(location.name)

    const unresolved = await card('Unresolved cases')
    expect(within(unresolved).getByRole('tab', { name: /^Unresolved/ })).toHaveTextContent(
      String(cases.unresolved),
    )
    expect(within(unresolved).getByRole('link', { name: 'View all cases' })).toHaveAttribute(
      'href',
      '/violations?scope=ng&agent=JRB-AG-0142',
    )
    const repeats = await card('Repeat-vehicle reports')
    expect(within(repeats).getByRole('tab', { name: /^All Open/ })).toHaveTextContent(
      String(repeatVehicles.open),
    )
    for (const item of repeatVehicles.items.slice(0, 3)) {
      expect(repeats).toHaveTextContent(item.plate)
    }
  })
})
