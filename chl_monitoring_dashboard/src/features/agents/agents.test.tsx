import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeAgents } from '@/mocks/mock-agents-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'
import { totalsOf } from './agents-display'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}

/** What the page must show for an area: the same records every view counts, last 14 days. */
function expected(scope: string) {
  const today = lagosDay()
  return summarizeAgents({ scope, range: '14d', ...presetPeriod('14d', today) })
}

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
})
