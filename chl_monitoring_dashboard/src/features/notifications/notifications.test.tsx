import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeNotifications, unreadCount } from '@/mocks/mock-notifications-api'
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
    expect(await figure('Open SOS')).toHaveTextContent(
      `${openSos}Still open, as CHL reports them · ${field.filter((item) => item.type === 'sos').length} SOS received`,
    )
    expect(await figure('Field notifications')).toHaveTextContent(String(field.length))
    expect(await figure('Enforcement notifications')).toHaveTextContent(String(enforcement.length))
  })

  it('has a tab for all notifications, then Enforcement, Field and Operational', async () => {
    const all = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/notifications')
    const tabs = await screen.findByRole('tablist', { name: 'Notification views' })
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual([
      `All${all.length}`,
      `Enforcement${all.filter((item) => item.category === 'enforcement').length}`,
      `Field${all.filter((item) => item.category === 'field').length}`,
      // No count: CHL does not pass these on, which is not the same as none.
      'Operational',
    ])
    const register = await card('All notifications')
    const table = within(register).getByRole('table', { name: 'Notifications' })
    // Latest first, ten to a page.
    expect(bodyRows(table)).toHaveLength(Math.min(10, all.length))
    expect(bodyRows(table)[0]).toHaveTextContent(all[0]!.title)
  })

  it('lists one group on its tab, and keeps the tab in the address', async () => {
    const field = expected().filter((item) => item.category === 'field')
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/notifications')
    await userEvent.click(await screen.findByRole('tab', { name: /^Field/ }))
    const register = await card('Field notifications')
    const table = within(register).getByRole('table', { name: 'Field notifications' })
    expect(bodyRows(table)[0]).toHaveTextContent(field[0]!.title)
    for (const row of bodyRows(table)) expect(row).not.toHaveTextContent('Payment received for')
    expect(router.state.location.search).toBe('?view=field')
    // The register has no group column on a group's own tab.
    expect(within(table).queryByRole('columnheader', { name: /Group/ })).not.toBeInTheDocument()
  })

  it('narrows the register to unread notifications of one type', async () => {
    const unreadSos = expected().filter((item) => !item.read && item.type === 'sos')
    expect(unreadSos.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/notifications?view=field')
    const register = await card('Field notifications')
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Status' }),
      'unread',
    )
    await userEvent.selectOptions(within(register).getByRole('combobox', { name: 'Type' }), 'sos')
    const table = within(register).getByRole('table', { name: 'Field notifications' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, unreadSos.length))
    for (const row of bodyRows(table)) {
      expect(row).toHaveTextContent('SOS')
      expect(row).toHaveTextContent('Unread')
    }
    expect(router.state.location.search).toBe('?view=field&status=unread&type=sos')

    // Another tab keeps the status but not the type, which belongs to one group.
    await userEvent.click(screen.getByRole('tab', { name: /^Enforcement/ }))
    expect(router.state.location.search).toBe('?view=enforcement&status=unread')
  })

  it('says CHL does not provide agents’ operational notifications, rather than none arrived', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/notifications?view=operational')
    const panel = await card('Operational notifications')
    expect(panel).toHaveTextContent('CHL does not provide agents’ operational notifications yet.')
    expect(within(panel).queryByRole('table')).not.toBeInTheDocument()
  })

  it('opens a notification in a popup on the page, and marks it read', async () => {
    const sos = expected().find((item) => item.type === 'sos' && !item.read)!
    const unread = unreadCount(['ng'])
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/notifications?view=field&type=sos')
    const register = await card('Field notifications')
    const table = within(register).getByRole('table', { name: 'Field notifications' })
    await userEvent.click(
      within(table).getAllByRole('button', { name: `Actions for ${sos.title}` })[0]!,
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View notification' }))

    const dialog = await screen.findByRole('dialog', { name: sos.title })
    expect(dialog).toHaveTextContent(sos.entry!.sos!.message ?? 'No message was sent with the SOS.')
    expect(dialog).toHaveTextContent(`${sos.agent!.id} · ${sos.agent!.name}`)
    expect(dialog).toHaveTextContent('where it was sent, not a live position')
    expect(router.state.location.pathname).toBe('/notifications')
    expect(router.state.location.search).toContain(`notification=${sos.id}`)

    // Opened, it counts as read: in the popup, and on the bell and in the sidebar.
    expect(await within(dialog).findByText('Read')).toBeInTheDocument()
    expect(
      await screen.findAllByRole('link', { name: `Notifications, ${unread - 1} unread` }),
    ).toHaveLength(2)
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a repeat-vehicle notification with the vehicle as its alert counts it', async () => {
    const repeat = expected().find((item) => item.type === 'repeat_vehicle')!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/notifications?notification=${repeat.id}`)
    const dialog = await screen.findByRole('dialog', { name: repeat.title })
    const vehicle = within(dialog).getByRole('region', { name: 'Vehicle' })
    expect(vehicle).toHaveTextContent(`Plate${repeat.plate}`)
    expect(vehicle).toHaveTextContent(`Reports${repeat.repeatVehicle!.reports}`)
    expect(vehicle).toHaveTextContent(`Agents${repeat.repeatVehicle!.agents}`)
  })

  it('opens a repeat vehicle’s reports from its notification, on the page', async () => {
    const repeat = expected().find((item) => item.type === 'repeat_vehicle')!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp(`/notifications?notification=${repeat.id}`)
    const dialog = await screen.findByRole('dialog', { name: repeat.title })
    const links = within(dialog).getByRole('navigation', { name: 'Related records' })
    await userEvent.click(within(links).getByRole('button', { name: 'View vehicle reports' }))
    const reports = await screen.findByRole('dialog', { name: 'Vehicle reports' })
    expect(reports).toHaveTextContent(repeat.plate!)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(router.state.location.pathname).toBe('/notifications')
  })

  it('opens a payment’s demand notice from the register, on the page', async () => {
    const payment = expected().find((item) => item.type === 'payment_received')!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/notifications?view=enforcement&type=payment_received')
    const register = await card('Enforcement notifications')
    const table = within(register).getByRole('table', { name: 'Enforcement notifications' })
    await userEvent.click(
      within(table).getAllByRole('button', { name: `Actions for ${payment.title}` })[0]!,
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open the payment' }))
    expect(
      await screen.findByRole('dialog', {
        name: `Demand notice ${payment.entry!.payment!.noticeId}`,
      }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/notifications')
  })

  it('offers only the records the role may open', async () => {
    const withAgent = summarizeNotifications({
      scope: 'la-ikeja',
      range: '14d',
      ...presetPeriod('14d', lagosDay()),
      agentId: null,
      organization: null,
    }).notifications.find((item) => item.agent)!
    // A Principal Officer may not open the Agents module.
    signInAs('po@jrb.gov.ng')
    renderApp(`/notifications?notification=${withAgent.id}`)
    const dialog = await screen.findByRole('dialog', { name: withAgent.title })
    expect(within(dialog).queryByRole('button', { name: 'View agent' })).not.toBeInTheDocument()
  })

  it('lists what a headline figure counts, keeping the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/notifications?scope=la&range=30d')
    await userEvent.click(await screen.findByRole('link', { name: /Not opened yet/ }))
    expect(router.state.location.search).toBe('?scope=la&range=30d&view=all&status=unread')
    const register = await card('All notifications')
    expect(within(register).getByRole('combobox', { name: 'Status' })).toHaveValue('unread')

    await userEvent.click(screen.getByRole('link', { name: /SOS received/ }))
    expect(router.state.location.search).toBe('?scope=la&range=30d&view=field&type=sos')
  })

  it('says when the notification named in the address is not in the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/notifications?notification=ntf-unknown')
    expect(
      await screen.findByText(
        'That notification is not in this area and period. Choose another area or period to find it.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
