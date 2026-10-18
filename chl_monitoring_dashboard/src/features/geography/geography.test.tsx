import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarize } from '@/mocks/mock-overview-api'
import { mockRecords } from '@/mocks/mock-records'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

const card = (title: string) => screen.findByRole('region', { name: title })
const feature = async (title: string) => screen.findByRole('region', { name: title })

/** What the page must show for an area: the same counting as every view, last 14 days. */
function expected(scope: string) {
  const today = lagosDay()
  return summarize(mockRecords(today), {
    scope,
    range: '14d',
    ...presetPeriod('14d', today),
    agentId: null,
    organization: null,
  })
}

describe('geographical monitoring page', () => {
  it('offers the eight monitoring scopes, in the order the document lists them', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')

    const scope = await card('Monitoring scope')
    const levels = within(scope)
      .getAllByRole('tab')
      .map((tab) => tab.textContent?.replace(/\d+$/, '').trim())
    expect(levels).toEqual([
      'Enforcement location',
      'Enforcement zone',
      'Ward',
      'LGA',
      'State',
      'Region',
      'Subregion',
      'National',
    ])
    expect(within(scope).getByRole('tab', { name: /^National/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows the features the document lists for the scope, with its records', async () => {
    const sample = expected('ng')
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')

    expect(await feature('Verification totals and outcomes')).toHaveTextContent(
      `${sample.kpis.totalVerifications}verifications`,
    )
    expect(await feature('Agent activity')).toHaveTextContent(
      `${sample.kpis.agentsWithActivity}agents with recorded activity`,
    )
    expect(await feature('Violations issued')).toHaveTextContent(
      `${sample.kpis.violationsIssued}violations issued`,
    )
    expect(await feature('Unresolved and escalated cases')).toHaveTextContent(
      `${sample.kpis.unresolvedViolations}unresolved${sample.kpis.escalatedViolations}escalated`,
    )
    expect(await feature('Repeat-vehicle alerts')).toHaveTextContent(
      `${sample.kpis.openRepeatAlerts}open alerts`,
    )
    expect(await feature('Related payment / compliance status')).toHaveTextContent(
      `${sample.payments.received}payments received${sample.payments.pending}pending`,
    )
    expect(await feature('Enforcement locations and recorded GPS positions')).toHaveTextContent(
      '6enforcement points',
    )
    const records = await feature('Access to underlying records')
    expect(within(records).getByRole('link', { name: 'Verification records' })).toHaveAttribute(
      'href',
      '/verifications?scope=ng',
    )
    expect(within(records).getByRole('link', { name: 'Evidence records' })).toHaveAttribute(
      'href',
      '/evidence?scope=ng',
    )

    // Nothing from the Overview that the document does not list.
    expect(screen.queryByRole('region', { name: 'Recent activity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Headline figures' })).not.toBeInTheDocument()
  })

  it('chooses an area at a level, and counts again for it', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const scope = await card('Monitoring scope')
    await userEvent.click(within(scope).getByRole('tab', { name: /^State/ }))
    const lagos = within(scope).getByRole('button', { name: /Lagos state/ })
    expect(lagos).toHaveTextContent('in South West region')
    await userEvent.click(lagos)

    expect(await card('Activity in Lagos state')).toBeInTheDocument()
    expect(await feature('Verification totals and outcomes')).toHaveTextContent(
      `${expected('la').kpis.totalVerifications}verifications`,
    )
    const trail = screen.getByRole('navigation', { name: 'Monitoring scope' })
    expect(within(trail).getByText('Lagos state')).toHaveAttribute('aria-current', 'location')
    await userEvent.click(within(trail).getByRole('button', { name: 'National' }))
    expect(await card('Activity in National')).toBeInTheDocument()
  })

  it('says when CHL configures no areas at a level', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const scope = await card('Monitoring scope')
    await userEvent.click(within(scope).getByRole('tab', { name: /^Subregion/ }))
    expect(scope).toHaveTextContent('CHL has no subregions configured within your areas.')
  })

  it('follows the configured tree, whatever the levels under an area', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography?scope=la-ikeja')
    const areas = await card('Areas within Ikeja LGA')
    expect(within(areas).getByRole('button', { name: 'Ojota ward' })).toBeInTheDocument()
    expect(within(areas).getByRole('button', { name: 'Ikeja Gate 3' })).toBeInTheDocument()
    expect(within(areas).getByText('Enforcement point')).toBeInTheDocument()
  })

  it('shows an enforcement location on its own, with its recorded position', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography?scope=loc_ojota')
    expect(await card('Areas within Ojota enforcement point')).toHaveTextContent(
      'This is an enforcement point',
    )
    const locations = await card('Enforcement locations')
    await userEvent.click(within(locations).getByRole('tab', { name: 'List' }))
    expect(within(locations).getByText('Ojota enforcement point')).toBeInTheDocument()
    expect(within(locations).getByText(/^GPS 6\.5866, 3\.3792/)).toBeInTheDocument()
  })

  it('keeps national visibility to authorized users', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/geography?scope=ng')
    expect(await card('Activity in Lagos state')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Monitoring scope' })).not.toBeInTheDocument()

    const scope = await card('Monitoring scope')
    await userEvent.click(within(scope).getByRole('tab', { name: /^National/ }))
    expect(scope).toHaveTextContent('Consolidated national visibility is for authorized users')
  })
})
