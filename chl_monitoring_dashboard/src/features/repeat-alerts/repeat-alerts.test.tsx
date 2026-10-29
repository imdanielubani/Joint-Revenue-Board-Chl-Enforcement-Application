import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeRepeatAlerts } from '@/mocks/mock-repeat-alerts-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

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
})
