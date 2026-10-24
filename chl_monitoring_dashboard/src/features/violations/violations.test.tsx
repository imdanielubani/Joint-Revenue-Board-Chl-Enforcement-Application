import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeViolations } from '@/mocks/mock-violations-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'
import { isUnresolved } from './violations-display'
import { VIOLATION_CATEGORIES } from './violations.schemas'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}
/** The rows on a register's first page, header row left out. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)

/** What the page must show nationally over the last 30 days. */
const expected = () =>
  summarizeViolations({
    scope: 'ng',
    range: '30d',
    ...presetPeriod('30d', lagosDay()),
    agentId: null,
    organization: null,
  }).cases

describe('violations and cases page', () => {
  it('counts the violations received, unresolved, payment pending and closed or cancelled', async () => {
    const cases = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations?range=30d')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Violations & cases' }),
    ).toBeVisible()
    expect(await figure('Violations received')).toHaveTextContent(String(cases.length))
    expect(await figure('Unresolved cases')).toHaveTextContent(
      String(cases.filter(isUnresolved).length),
    )
    expect(await figure('Payment pending')).toHaveTextContent(
      String(cases.filter((item) => item.status === 'payment_pending').length),
    )
    expect(await figure('Closed or cancelled')).toHaveTextContent(
      String(cases.filter((item) => item.closure).length),
    )
  })

  it('has a tab for each of the document’s sections 8.1 to 8.5', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations')
    const tabs = await screen.findByRole('tablist', { name: 'Violation views' })
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent?.replace(/\d+$/, '')),
    ).toEqual([
      'Violation Register',
      'Violation Categories',
      'Status Views',
      'Unresolved Cases',
      'Closure & Cancellation History',
    ])
  })

  it('opens a case with its vehicle, agent, location, time, evidence, notes and demand notice', async () => {
    const item = expected().find((entry) => entry.notice && entry.notes.length > 0)!
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations?range=30d')
    const table = await screen.findByRole('table', { name: 'Violations' })
    await userEvent.type(within(await card('Violation Register')).getByRole('searchbox'), item.id)
    expect(within(table).getByText(item.id).closest('button, a')).toBeNull()
    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${item.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View case' }))

    const dialog = await screen.findByRole('dialog', { name: `Case ${item.id}` })
    for (const heading of [
      'Violation',
      'Vehicle, agent and location',
      'Evidence and notes',
      'Demand notice and payment',
      'Recorded actions',
      'Closure and cancellation',
    ]) {
      expect(within(dialog).getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(dialog).toHaveTextContent(item.notice!.id)
    expect(dialog).toHaveTextContent(item.notes[0]!.text)
    expect(dialog).toHaveTextContent(item.agent.name)
    // The related records open as popups here; payments wait for the Payments module.
    for (const name of ['View evidence', 'View verification', 'View agent']) {
      expect(within(dialog).getByRole('button', { name })).toBeInTheDocument()
    }
    expect(within(dialog).queryByRole('link', { name: 'Open the payment' })).toBeNull()
    // Read-only: no way to close or cancel a case.
    expect(
      within(dialog).queryByRole('button', { name: /close case|cancel|resolve|edit/i }),
    ).toBeNull()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('opens the case’s evidence in its viewer, in place of the case', async () => {
    const item = expected().find((entry) => entry.evidence)!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/violations?range=30d&case=${item.id}`)
    const dialog = await screen.findByRole('dialog', { name: `Case ${item.id}` })
    await userEvent.click(within(dialog).getByRole('button', { name: 'View evidence' }))

    const viewer = await screen.findByRole('dialog', { name: `Evidence ${item.evidence!.id}` })
    expect(within(viewer).getByRole('heading', { name: 'Photograph viewer' })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('opens a violation’s verification and agent from its row, without leaving the page', async () => {
    const item = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/violations?range=30d')
    const table = await screen.findByRole('table', { name: 'Violations' })
    const actions = within(table).getByRole('button', { name: `Actions for ${item.id}` })

    await userEvent.click(actions)
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Open the payment' })).toBeNull()
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'View verification' }))
    const verification = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(verification).toHaveTextContent(item.verification.reference)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await userEvent.click(actions)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View agent' }))
    const agent = await screen.findByRole('dialog', { name: 'Agent details' })
    expect(agent).toHaveTextContent(item.agent.id)
    expect(router.state.location.pathname).toBe('/violations')
  })

  it('lists the documented categories, the tag-vehicle mismatch as a documented breach', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations?range=30d&view=categories')
    const panel = await card('Violation Categories')
    const rows = within(panel).getAllByRole('listitem')
    expect(rows.map((row) => row.querySelector('span')?.textContent)).toEqual(
      VIOLATION_CATEGORIES.map((category) =>
        category === 'Tag-Vehicle Mismatch'
          ? `${category}A documented breach, not in the SRD’s initial category list`
          : category,
      ),
    )
  })

  it('lists a category’s violations in the register when chosen', async () => {
    const category = 'Expired Trip'
    const count = expected().filter((item) => item.category === category).length
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations?range=30d&view=categories')
    const panel = await card('Violation Categories')
    await userEvent.click(
      within(panel).getByRole('button', { name: `View ${category} violations` }),
    )
    const register = await card('Violation Register')
    expect(within(register).getByRole('combobox', { name: 'Category' })).toHaveValue(category)
    const table = within(register).getByRole('table', { name: 'Violations' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, count))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent(category)
  })

  it('shows the status views and any other state CHL returns', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations?range=30d&view=statuses')
    const panel = await card('Status Views')
    for (const label of ['Payment Pending', 'Resolved', 'Escalated', 'Cancelled']) {
      expect(within(panel).getByText(label)).toBeInTheDocument()
    }
    expect(panel).toHaveTextContent('Awaiting Action')
    expect(panel).toHaveTextContent('Another state returned by CHL')
  })

  it('lists only outstanding cases under Unresolved Cases, with follow-up and repeat alerts', async () => {
    const unresolved = expected().filter(isUnresolved)
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations?range=30d&status=unresolved')
    const panel = await card('Unresolved Cases')
    const table = within(panel).getByRole('table', { name: 'Unresolved cases' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, unresolved.length))
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(
      expect.arrayContaining(['Pending follow-up', 'Last recorded action', 'Repeat-vehicle alert']),
    )
  })

  it('shows how and by whom each case was closed or cancelled', async () => {
    const closed = expected().filter((item) => item.closure)
    const cancelled = closed.find((item) => item.closure!.outcome === 'cancelled')
    signInAs('admin@jrb.gov.ng')
    renderApp('/violations?range=30d&view=history')
    const panel = await card('Closure and Cancellation History')
    const table = within(panel).getByRole('table', { name: 'Closed and cancelled cases' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, closed.length))
    if (cancelled) {
      await userEvent.type(within(panel).getByRole('searchbox'), cancelled.id)
      const row = within(table).getByText(cancelled.id).closest('tr')!
      expect(row).toHaveTextContent('Cancelled')
      expect(row).toHaveTextContent(cancelled.closure!.actor!.name)
      expect(row).toHaveTextContent(cancelled.closure!.auditReference!)
    }
  })

  it('opens the case named in the address, as other pages link to it', async () => {
    const item = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/violations?range=30d&case=${item.id}`)
    expect(await screen.findByRole('dialog', { name: `Case ${item.id}` })).toBeInTheDocument()
  })
})
