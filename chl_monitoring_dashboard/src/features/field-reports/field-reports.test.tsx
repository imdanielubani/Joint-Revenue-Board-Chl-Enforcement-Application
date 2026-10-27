import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeFieldReports } from '@/mocks/mock-field-reports-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

const card = (title: string) => screen.findByRole('region', { name: title })
/** The rows on a register's first page, header row left out. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)
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

  it('lists the field reports, latest first, then the loaded / empty confirmations on their tab', async () => {
    const { reports, loadReports } = expected()
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/field-reports')
    const tabs = await screen.findByRole('tablist', { name: 'Field report views' })
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual([`Reports${reports.length}`, `Loaded / empty${loadReports.length}`])
    const register = await card('Field report register')
    const table = within(register).getByRole('table', { name: 'Field reports' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, reports.length))
    expect(bodyRows(table)[0]).toHaveTextContent(reports[0]!.report!.summary)
    expect(bodyRows(table)[0]).toHaveTextContent(reports[0]!.agent.name)

    await userEvent.click(within(tabs).getByRole('tab', { name: /^Loaded \/ empty/ }))
    expect(router.state.location.search).toBe('?view=loads')
    const loads = await card('Loaded / empty register')
    const loadTable = within(loads).getByRole('table', { name: 'Loaded / empty confirmations' })
    expect(bodyRows(loadTable)).toHaveLength(Math.min(10, loadReports.length))
    expect(bodyRows(loadTable)[0]).toHaveTextContent(loadReports[0]!.plate!)
    expect(bodyRows(loadTable)[0]).toHaveTextContent(
      loadReports[0]!.load === 'loaded' ? 'Loaded' : 'Empty',
    )
  })

  it('narrows the registers by report type, loaded or empty, and how they reached CHL', async () => {
    const { reports } = expected()
    const driver = reports.filter((item) => item.report?.type === 'driver')
    expect(driver.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/field-reports')
    const register = await card('Field report register')
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Report type' }),
      'driver',
    )
    const table = within(register).getByRole('table', { name: 'Field reports' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, driver.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Driver report')
    expect(router.state.location.search).toBe('?type=driver')
  })

  it('opens the loaded / empty register filtered as the address says', async () => {
    const { loadReports } = expected()
    const live = loadReports.filter((item) => item.load === 'empty' && item.source === 'live')
    expect(live.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-reports?view=loads&load=empty&source=live')
    const register = await card('Loaded / empty register')
    expect(within(register).getByRole('combobox', { name: 'Confirmed' })).toHaveValue('empty')
    expect(within(register).getByRole('combobox', { name: 'Received' })).toHaveValue('live')
    const table = within(register).getByRole('table', { name: 'Loaded / empty confirmations' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, live.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Empty')
  })

  it('breaks the reports down by type and loaded / empty, each listing its records below', async () => {
    const { reports, loadReports } = expected()
    const situation = reports.filter((item) => item.report?.type === 'situation').length
    const empty = loadReports.filter((item) => item.load === 'empty').length
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/field-reports?source=live')
    const byType = await card('Reports by type')
    const tile = within(byType).getByRole('button', { name: 'View Situation report records' })
    expect(tile).toHaveTextContent(String(situation))
    await userEvent.click(tile)
    expect(router.state.location.search).toBe('?view=reports&type=situation')

    const loads = await card('Loaded / empty')
    const emptyTile = within(loads).getByRole('button', { name: 'View Empty records' })
    expect(emptyTile).toHaveTextContent(String(empty))
    await userEvent.click(emptyTile)
    expect(router.state.location.search).toBe('?view=loads&load=empty')
    const register = await card('Loaded / empty register')
    expect(within(register).getByRole('combobox', { name: 'Confirmed' })).toHaveValue('empty')
  })
})
