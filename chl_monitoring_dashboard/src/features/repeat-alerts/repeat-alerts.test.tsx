import { screen, waitFor, within } from '@testing-library/react'
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

  it('opens an alert in a popup: the vehicle, then its related reports', async () => {
    const alert = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/repeat-alerts')
    const register = await card('Alert register')
    const table = within(register).getByRole('table', { name: 'Repeat vehicle alerts' })
    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${alert.plate}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View alert' }))

    const dialog = await screen.findByRole('dialog', { name: `Repeat vehicle ${alert.plate}` })
    expect(router.state.location.search).toBe(`?alert=${alert.plate}`)
    const vehicle = within(dialog).getByRole('region', { name: 'Vehicle' })
    expect(vehicle).toHaveTextContent(`Qualifying reports${alert.reports}`)
    const reports = within(dialog).getByRole('table', { name: `Reports of ${alert.plate}` })
    // Every report of the plate, oldest first; cancelled ones do not count.
    expect(bodyRows(reports)).toHaveLength(Math.min(5, alert.cases.length))
    for (const [index, row] of bodyRows(reports).entries()) {
      const item = alert.cases[index]!
      expect(row).toHaveTextContent(item.id)
      expect(row).toHaveTextContent(item.status === 'cancelled' ? 'No · cancelled' : 'Yes')
    }
  })

  it('says when the alert named in the address is not in the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/repeat-alerts?alert=NO-SUCH-PLATE')
    expect(
      await screen.findByText(/NO-SUCH-PLATE has no repeat-vehicle alert in this area and period/),
    ).toBeInTheDocument()
  })

  it('shows the agents and locations involved in an alert, with their qualifying reports', async () => {
    const alert = expected()[0]!
    const qualifying = alert.cases.filter((item) => item.status !== 'cancelled')
    const tally = (key: (item: (typeof qualifying)[number]) => string) => {
      const counts = new Map<string, number>()
      for (const item of qualifying) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
      return counts
    }
    const perAgent = tally((item) => item.agent.id)
    const perLocation = tally((item) => item.location.code)
    signInAs('admin@jrb.gov.ng')
    renderApp(`/repeat-alerts?alert=${alert.plate}`)
    const dialog = await screen.findByRole('dialog', { name: `Repeat vehicle ${alert.plate}` })

    const agents = within(dialog).getByRole('table', { name: `Agents who reported ${alert.plate}` })
    expect(bodyRows(agents)).toHaveLength(Math.min(5, perAgent.size))
    for (const row of bodyRows(agents)) {
      const id = [...perAgent.keys()].find((agentId) => row.textContent?.includes(agentId))!
      expect(within(row).getAllByRole('cell')[1]).toHaveTextContent(String(perAgent.get(id)))
    }

    const locations = within(dialog).getByRole('table', {
      name: `Where ${alert.plate} was reported`,
    })
    expect(bodyRows(locations)).toHaveLength(Math.min(5, perLocation.size))
    for (const row of bodyRows(locations)) {
      const code = [...perLocation.keys()].find((place) => row.textContent?.includes(place))!
      expect(within(row).getAllByRole('cell')[1]).toHaveTextContent(String(perLocation.get(code)))
    }
    // Between them, the agents' reports and the locations' reports are the alert's.
    expect([...perAgent.values()].reduce((a, b) => a + b, 0)).toBe(alert.reports)
    expect([...perLocation.values()].reduce((a, b) => a + b, 0)).toBe(alert.reports)
  })

  it('shows the actions recorded on the alert’s cases, oldest first, with who took them', async () => {
    const alert = expected()[0]!
    const actions = alert.cases
      .flatMap((item) => item.actions.map((action) => ({ id: item.id, action })))
      .sort((a, b) => Date.parse(a.action.at) - Date.parse(b.action.at))
    expect(actions.length).toBeGreaterThanOrEqual(alert.cases.length)
    signInAs('admin@jrb.gov.ng')
    renderApp(`/repeat-alerts?alert=${alert.plate}`)
    const dialog = await screen.findByRole('dialog', { name: `Repeat vehicle ${alert.plate}` })
    const table = within(dialog).getByRole('table', {
      name: `Actions recorded on the cases of ${alert.plate}`,
    })
    expect(bodyRows(table)).toHaveLength(Math.min(8, actions.length))
    for (const [index, row] of bodyRows(table).entries()) {
      const { id, action } = actions[index]!
      expect(row).toHaveTextContent(id)
      expect(row).toHaveTextContent(action.actor ? action.actor.name : 'Automatic step')
    }
    // Every case starts with its violation being issued.
    expect(bodyRows(table)[0]).toHaveTextContent('Violation issued')
  })

  it('opens a report’s case, with its recorded actions, from the alert', async () => {
    const alert = expected()[0]!
    const first = alert.cases[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp(`/repeat-alerts?alert=${alert.plate}`)
    const dialog = await screen.findByRole('dialog', { name: `Repeat vehicle ${alert.plate}` })
    const reports = within(dialog).getByRole('table', { name: `Reports of ${alert.plate}` })
    await userEvent.click(within(reports).getByRole('button', { name: `Actions for ${first.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View case' }))
    expect(await screen.findByRole('dialog', { name: `Case ${first.id}` })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(router.state.location.pathname).toBe('/repeat-alerts')
  })

  it('opens an involved agent and the vehicle’s reports, on the page', async () => {
    const alert = expected()[0]!
    const agent = alert.cases.find((item) => item.status !== 'cancelled')!.agent
    signInAs('admin@jrb.gov.ng')
    renderApp(`/repeat-alerts?alert=${alert.plate}`)
    const dialog = await screen.findByRole('dialog', { name: `Repeat vehicle ${alert.plate}` })
    const agents = within(dialog).getByRole('table', { name: `Agents who reported ${alert.plate}` })
    await userEvent.click(within(agents).getByRole('button', { name: `Actions for ${agent.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View agent' }))
    expect(await screen.findByRole('dialog', { name: /Agent/ })).toHaveTextContent(agent.name)
    await userEvent.keyboard('{Escape}')

    const register = await card('Alert register')
    const table = within(register).getByRole('table', { name: 'Repeat vehicle alerts' })
    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${alert.plate}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View vehicle reports' }))
    expect(await screen.findByRole('dialog', { name: 'Vehicle reports' })).toHaveTextContent(
      alert.plate,
    )
  })

  it('offers only the records the role may open', async () => {
    const alert = summarizeRepeatAlerts({
      scope: 'la-ikeja',
      range: '90d',
      ...presetPeriod('90d', lagosDay()),
      agentId: null,
      organization: null,
    }).alerts[0]!
    // A Principal Officer may open cases, but not the Agents module.
    signInAs('po@jrb.gov.ng')
    renderApp(`/repeat-alerts?range=90d&alert=${alert.plate}`)
    const dialog = await screen.findByRole('dialog', { name: `Repeat vehicle ${alert.plate}` })
    const agents = within(dialog).getByRole('table', { name: `Agents who reported ${alert.plate}` })
    expect(within(agents).queryByRole('button', { name: /^Actions for/ })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'View vehicle reports' })).toBeInTheDocument()
  })

  it('lists the notifications the supervisory process sent, each leading to its alert', async () => {
    const sent = expected()
      .filter((alert) => alert.notification)
      .sort(
        (a, b) => Date.parse(b.notification!.receivedAt) - Date.parse(a.notification!.receivedAt),
      )
    expect(sent.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/repeat-alerts')
    const tabs = await screen.findByRole('tablist', { name: 'Repeat vehicle alert views' })
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual([`Alert register${expected().length}`, `Supervisory notifications${sent.length}`])
    await userEvent.click(within(tabs).getByRole('tab', { name: /^Supervisory notifications/ }))
    expect(router.state.location.search).toBe('?view=notifications')
    const register = await card('Supervisory notifications')
    const table = within(register).getByRole('table', { name: 'Supervisory notifications' })
    for (const [index, row] of bodyRows(table).entries()) {
      const alert = sent[index]!
      expect(row).toHaveTextContent(`Repeat vehicle ${alert.plate}`)
      expect(row).toHaveTextContent(alert.notification!.read ? 'Read' : 'Unread')
    }
    const first = sent[0]!
    await userEvent.click(
      within(table).getByRole('button', { name: `Actions for ${first.notification!.id}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View alert' }))
    expect(
      await screen.findByRole('dialog', { name: `Repeat vehicle ${first.plate}` }),
    ).toBeInTheDocument()
  })

  it('shows the alert’s supervisory notification, and opens it on the Notifications page', async () => {
    const alert = expected().find((item) => item.notification)!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp(`/repeat-alerts?alert=${alert.plate}`)
    const dialog = await screen.findByRole('dialog', { name: `Repeat vehicle ${alert.plate}` })
    const notice = within(dialog).getByRole('region', { name: 'Supervisory notification' })
    expect(notice).toHaveTextContent(alert.notification!.read ? 'Read' : 'Unread')
    await userEvent.click(within(notice).getByRole('link', { name: 'Open notification' }))
    // The Notifications page opens the notification in its own popup, of the same name.
    await waitFor(() => expect(router.state.location.pathname).toBe('/notifications'))
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: `Repeat vehicle ${alert.plate}` }),
      ).toHaveTextContent('Repeat-vehicle alert · Enforcement'),
    )
    expect(new URLSearchParams(router.state.location.search).get('notification')).toBe(
      alert.notification!.id,
    )
  })

  it('is where the Overview and Command centre repeat-vehicle figures lead', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const figures = await screen.findByRole('list', { name: 'Headline figures' })
    expect(within(figures).getByRole('link', { name: /no follow-up recorded/ })).toHaveAttribute(
      'href',
      '/repeat-alerts?follow_up=none',
    )
  })

  it('is where the Command centre’s open repeat vehicles lead, over the history kept', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/command-centre')
    await userEvent.click(
      await screen.findByRole('link', { name: /Three or more reports, none followed up/ }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Repeat vehicle alerts' }),
    ).toBeInTheDocument()
    expect(router.state.location.search).toBe('?range=90d&follow_up=none')
    const register = await card('Alert register')
    expect(within(register).getByRole('combobox', { name: 'Follow-up' })).toHaveValue('none')
  })
})
