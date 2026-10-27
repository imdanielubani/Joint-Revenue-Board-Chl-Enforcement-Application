import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeFieldReports } from '@/mocks/mock-field-reports-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}

/** What the page must show for an area over the last 14 days, the default period. */
const expected = (scope = 'ng') =>
  summarizeFieldReports({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  })

describe('field reports page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-reports')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Field reports' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Field reports' })
    expect(hero).toHaveTextContent('JRB CHL/Enforcement')
    expect(hero).toHaveTextContent('Read-only: nothing is answered or changed here.')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
  })

  it('reports on the area the user picks, within their own', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/field-reports?scope=ng')
    const hero = await screen.findByRole('region', { name: 'Field reports' })
    // A Lagos supervisor cannot widen the view to the whole country.
    expect(hero).toHaveTextContent('from the field in Lagos')
  })

  it('is not open to a role without the module', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/field-reports')
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('counts the field reports, loaded and empty confirmations, and those recorded offline', async () => {
    const { reports, loadReports } = expected()
    const loaded = loadReports.filter((item) => item.load === 'loaded').length
    const empty = loadReports.filter((item) => item.load === 'empty').length
    const offline = [...reports, ...loadReports].filter((item) => item.source === 'offline').length
    expect(loaded).toBeGreaterThan(0)
    expect(empty).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-reports')
    expect(await figure('Field reports')).toHaveTextContent(String(reports.length))
    expect(await figure('Loaded')).toHaveTextContent(
      `${loaded}Of ${loadReports.length} loaded / empty confirmations`,
    )
    expect(await figure('Empty')).toHaveTextContent(
      `${empty}Of ${loadReports.length} loaded / empty confirmations`,
    )
    expect(await figure('Recorded offline')).toHaveTextContent(String(offline))
  })
})
