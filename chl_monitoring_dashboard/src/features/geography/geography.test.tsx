import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { summarize } from '@/mocks/mock-overview-api'
import { mockRecords } from '@/mocks/mock-records'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'
import { presetPeriod } from '@/features/overview/overview-period'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}

/** What the page must show for an area: the Overview's own counting, last 14 days. */
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
  it('shows the national figures and the regions under it', async () => {
    const sample = expected('ng')
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Geographical monitoring' }),
    ).toBeVisible()
    expect(await figure('Verifications')).toHaveTextContent(String(sample.kpis.totalVerifications))
    expect(await figure('Violations issued')).toHaveTextContent(
      String(sample.kpis.violationsIssued),
    )
    expect(within(await figure('Verifications')).getByRole('link')).toHaveAttribute(
      'href',
      '/verifications?scope=ng',
    )

    const areas = await card('Areas within National')
    for (const region of [
      'South West region',
      'North West region',
      'North Central region',
      'South South region',
    ]) {
      expect(within(areas).getByRole('button', { name: region })).toBeInTheDocument()
    }
  })

  it('moves into an area and back up the scope trail', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography')
    const areas = await card('Areas within National')
    await userEvent.click(within(areas).getByRole('button', { name: 'South West region' }))

    expect(await card('Areas within South West region')).toBeInTheDocument()
    const trail = screen.getByRole('navigation', { name: 'Monitoring scope' })
    expect(within(trail).getByText('South West region')).toHaveAttribute('aria-current', 'location')
    expect(await figure('Verifications')).toHaveTextContent(
      String(expected('sw').kpis.totalVerifications),
    )

    await userEvent.click(within(trail).getByRole('button', { name: 'National' }))
    expect(await card('Areas within National')).toBeInTheDocument()
  })

  it('follows the configured tree, whatever the levels under an area', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/geography?scope=la-ikeja')
    const areas = await card('Areas within Ikeja LGA')
    expect(within(areas).getByRole('button', { name: 'Ojota ward' })).toBeInTheDocument()
    expect(within(areas).getByRole('button', { name: 'Ikeja Gate 3' })).toBeInTheDocument()
    expect(within(areas).getByText('Enforcement point')).toBeInTheDocument()
  })

  it('shows an enforcement point on its own, with its recorded position', async () => {
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

  it('keeps a Lagos user inside Lagos', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/geography?scope=ng')
    expect(await card('Areas within Lagos state')).toBeInTheDocument()
    // Lagos is the top of this user's areas: no trail leads above it.
    expect(screen.queryByRole('navigation', { name: 'Monitoring scope' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'National' })).not.toBeInTheDocument()
  })
})
