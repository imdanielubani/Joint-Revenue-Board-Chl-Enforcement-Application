import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeRepeatAlerts } from '@/mocks/mock-repeat-alerts-api'
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
  summarizeRepeatAlerts({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).alerts

describe('repeat vehicle alerts page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/repeat-alerts')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Repeat vehicle alerts' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Repeat vehicle alerts' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('Read-only: no case is closed or changed here.')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
  })

  it('reports on the area the user picks, within their own', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/repeat-alerts?scope=ng')
    const hero = await screen.findByRole('region', { name: 'Repeat vehicle alerts' })
    // A Principal Officer in Ikeja cannot widen the view to the whole country.
    expect(hero).toHaveTextContent('qualifying times in Ikeja')
  })

  it('counts the repeat vehicles, their follow-up and the notifications sent', async () => {
    const alerts = expected()
    expect(alerts.length).toBeGreaterThan(0)
    const none = alerts.filter((alert) => alert.followUp === 'none').length
    const partial = alerts.filter((alert) => alert.followUp === 'partial').length
    const notified = alerts.filter((alert) => alert.notification)
    signInAs('admin@jrb.gov.ng')
    renderApp('/repeat-alerts')
    expect(await figure('Repeat vehicles')).toHaveTextContent(
      `${alerts.length}3 or more qualifying reports, one still open`,
    )
    expect(await figure('No follow-up recorded')).toHaveTextContent(String(none))
    expect(await figure('Partial follow-up')).toHaveTextContent(String(partial))
    expect(await figure('Notifications sent')).toHaveTextContent(
      `${notified.length}By the supervisory process · ${
        notified.filter((alert) => !alert.notification!.read).length
      } unread`,
    )
  })

  it('lists each alert: its vehicle, reports, agents, locations, follow-up and notification', async () => {
    const alerts = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/repeat-alerts')
    const register = await card('Alert register')
    const table = within(register).getByRole('table', { name: 'Repeat vehicle alerts' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, alerts.length))
    for (const [index, row] of bodyRows(table).entries()) {
      const alert = alerts[index]!
      const qualifying = alert.cases.filter((item) => item.status !== 'cancelled')
      const cells = within(row).getAllByRole('cell')
      expect(cells[0]).toHaveTextContent(alert.plate)
      expect(cells[1]).toHaveTextContent(String(alert.reports))
      expect(cells[2]).toHaveTextContent(String(new Set(qualifying.map((c) => c.agent.id)).size))
      expect(cells[3]).toHaveTextContent(String(new Set(qualifying.map((c) => c.location.id)).size))
      expect(cells[5]).toHaveTextContent(
        alert.followUp === 'none' ? 'No follow-up recorded' : 'Partial follow-up',
      )
      expect(cells[6]).toHaveTextContent(alert.notification ? 'Sent' : 'Not sent')
    }
  })

  it('narrows the register by follow-up and notification, keeping them in the address', async () => {
    const alerts = expected()
    const none = alerts.filter((alert) => alert.followUp === 'none')
    expect(none.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/repeat-alerts')
    const register = await card('Alert register')
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Follow-up' }),
      'none',
    )
    const table = within(register).getByRole('table', { name: 'Repeat vehicle alerts' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, none.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('No follow-up recorded')
    expect(router.state.location.search).toBe('?follow_up=none')

    // Every sample alert was notified; the read ones are those older than a day.
    const read = none.filter((alert) => alert.notification?.read)
    expect(read.length).toBeGreaterThan(0)
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Notification' }),
      'read',
    )
    expect(router.state.location.search).toBe('?follow_up=none&notified=read')
    const filtered = within(register).getByRole('table', { name: 'Repeat vehicle alerts' })
    expect(bodyRows(filtered)).toHaveLength(Math.min(10, read.length))
    for (const row of bodyRows(filtered)) expect(row).toHaveTextContent('Read')
  })

  it('lists what a headline figure counts, keeping the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/repeat-alerts?scope=la&range=30d')
    await userEvent.click((await figure('Partial follow-up')).querySelector('a')!)
    expect(router.state.location.search).toBe('?scope=la&range=30d&follow_up=partial')
    const register = await card('Alert register')
    expect(within(register).getByRole('combobox', { name: 'Follow-up' })).toHaveValue('partial')
  })
})
