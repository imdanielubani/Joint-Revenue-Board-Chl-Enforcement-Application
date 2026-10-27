import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeNotifications } from '@/mocks/mock-notifications-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}

/** What the page must show for an area over the last 14 days, the default period. */
const expected = (scope = 'ng') =>
  summarizeNotifications({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).notifications

describe('notifications page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/notifications')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notifications' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Notifications' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('Read-only: nothing is sent to agents or answered here.')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
  })

  it('reports the notifications in the area the user picks, within their own', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/notifications?scope=ng')
    const hero = await screen.findByRole('region', { name: 'Notifications' })
    // A Principal Officer in Ikeja cannot widen the view to the whole country.
    expect(hero).toHaveTextContent('delivered for Ikeja')
  })

  it('counts the unread, open SOS, field and enforcement notifications', async () => {
    const all = expected()
    const field = all.filter((item) => item.category === 'field')
    const enforcement = all.filter((item) => item.category === 'enforcement')
    const unread = all.filter((item) => !item.read).length
    const openSos = field.filter((item) => item.entry?.sos?.status === 'open').length
    expect(unread).toBeGreaterThan(0)
    expect(openSos).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/notifications')
    expect(await figure('Unread')).toHaveTextContent(
      `${unread}Not opened yet, of ${all.length} in this period`,
    )
    expect(await figure('Open SOS')).toHaveTextContent(String(openSos))
    expect(await figure('Field notifications')).toHaveTextContent(String(field.length))
    expect(await figure('Enforcement notifications')).toHaveTextContent(String(enforcement.length))
  })
})
