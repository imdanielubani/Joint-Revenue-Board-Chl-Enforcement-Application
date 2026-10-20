import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'
import { SIDEBAR_COLLAPSED_KEY } from './AppShell'

/** The sidebar and top bar, once the page has loaded. */
const sidebar = () => screen.findByRole('complementary', { name: 'Sidebar' })
const topbar = () => screen.findByRole('banner')

describe('sidebar', () => {
  it('groups the modules as the design does, marking the current page', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const menu = await screen.findByRole('navigation', { name: 'Main' })
    const labels = within(menu)
      .getAllByRole('link')
      .map((link) => link.textContent?.replace(/,.*$/, '').replace(/\d+$/, ''))
    expect(labels).toEqual([
      'Overview',
      'Command centre',
      'Geographical monitoring',
      'Verifications & E-Tags',
      'Trip monitoring',
      'Violations & cases',
      'Agents & organizations',
      'Evidence records',
      'Payments & compliance',
      'Notifications',
      'History & audit',
      'Synchronization',
    ])
    expect(within(menu).getByText('Workspace')).toBeInTheDocument()
    expect(within(menu).getByText('Enforcement')).toBeInTheDocument()
    expect(within(menu).getByText('Monitoring')).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows unread notifications and cases needing attention', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    // The unread count also shows on the bell: look in the sidebar.
    expect(
      await within(await sidebar()).findByRole('link', { name: 'Notifications, 6 unread' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'Violations & cases, 3 need attention' }),
    ).toBeInTheDocument()
  })

  it('shows the workspace and the user', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/overview')

    const aside = await screen.findByRole('complementary', { name: 'Sidebar' })
    expect(within(aside).getByText('Lagos workspace')).toBeInTheDocument()
    expect(within(aside).getByText('Joint Revenue Board')).toBeInTheDocument()
    expect(within(aside).getByText('Tunde Bakare')).toBeInTheDocument()
    expect(within(aside).getByText('TB')).toBeInTheDocument()
  })

  it('collapses to icons and remembers it', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }))

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('true')
    // The labels stay available to screen readers and as tooltips.
    expect(within(await sidebar()).getByRole('link', { name: 'Trip monitoring' })).toHaveAttribute(
      'title',
      'Trip monitoring',
    )
  })

  it('opens collapsed when it was left collapsed', async () => {
    signInAs('admin@jrb.gov.ng')
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true')
    renderApp('/overview')

    expect(await screen.findByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('logs out', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(
      await within(await sidebar()).findByRole('button', {
        name: 'Log out',
      }),
    )

    expect(await screen.findByText('Logged out successfully')).toBeInTheDocument()
  })
})

describe('top bar', () => {
  it('shows the page title and breadcrumb', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Workspace',
      'Monitoring',
    ])
  })

  it('follows the page', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await within(await sidebar()).findByRole('link', { name: 'Trip monitoring' }))

    // The page's code loads the first time it is opened.
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Trip monitoring' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument()
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Enforcement',
      'Trip monitoring',
    ])
  })

  it('shows the unread count on the bell', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')

    const bell = await within(await topbar()).findByRole('link', {
      name: 'Notifications, 6 unread',
    })
    expect(bell).toHaveAttribute('href', '/notifications')
    expect(within(bell).getByText('6')).toBeInTheDocument()
  })

  it('searches all records', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')
    const user = userEvent.setup()
    // Let the page finish loading first, so its updates do not race the typing.
    await screen.findByRole('list', { name: 'Headline figures' })

    await user.type(
      await screen.findByRole('searchbox', { name: 'Search all records' }),
      'KJA 123 XY{Enter}',
    )

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/search'))
    expect(router.state.location.search).toBe('?q=KJA%20123%20XY')
    expect(await screen.findByText(/Results for “KJA 123 XY”/)).toBeInTheDocument()
  })

  it('opens CHL support from Help, with a way back to the dashboard', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Help and support' }))

    expect(await screen.findByRole('heading', { name: 'How can we help?' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to dashboard' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })
})

describe('account menu', () => {
  it('opens from the profile, with the keyboard working', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()
    const trigger = await within(await topbar()).findByRole('button', { name: /Account menu/ })

    await user.click(trigger)

    const menu = screen.getByRole('menu', { name: 'Account' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(within(menu).getByText('Adaeze Okafor')).toBeInTheDocument()
    expect(within(menu).getByText('System Administrator')).toBeInTheDocument()
    const items = within(menu).getAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual(['Profile', 'Settings', 'Log out'])
    expect(items[0]).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(items[1]).toHaveFocus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(items[2]).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on a click outside', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await within(await topbar()).findByRole('button', { name: /Account menu/ }))
    await user.click(screen.getByRole('heading', { level: 1 }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('goes to the profile', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await within(await topbar()).findByRole('button', { name: /Account menu/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/profile')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('logs out', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await within(await topbar()).findByRole('button', { name: /Account menu/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))

    expect(await screen.findByText('Logged out successfully')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('also opens from the sidebar', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await within(await sidebar()).findByRole('button', { name: /Account menu/ }))

    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument()
  })
})
