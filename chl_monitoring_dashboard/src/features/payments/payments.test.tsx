import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizePayments } from '@/mocks/mock-payments-api'
import { lagosDay } from '@/shared/lib/dates'
import { formatNaira } from '@/shared/lib/format'
import { renderApp, signInAs } from '@/test/render-app'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}
/** The rows on a register's first page, header row left out. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)

/** What the page must show nationally over the last 30 days. */
const expected = () =>
  summarizePayments({
    scope: 'ng',
    range: '30d',
    ...presetPeriod('30d', lagosDay()),
    agentId: null,
    organization: null,
  }).notices

describe('payments and compliance page', () => {
  it('counts the notices, payment pending, payment received and trips activated apart', async () => {
    const notices = expected()
    const received = notices.filter((notice) => notice.status === 'received')
    signInAs('admin@jrb.gov.ng')
    renderApp('/payments?range=30d')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Payments & compliance' }),
    ).toBeInTheDocument()
    expect(await figure('Demand notices')).toHaveTextContent(String(notices.length))
    expect(await figure('Payment pending')).toHaveTextContent(
      String(notices.filter((notice) => notice.status === 'pending').length),
    )
    expect(await figure('Payment received')).toHaveTextContent(String(received.length))
    // Trip activation is counted on its own, never taken from the payment.
    const activated = received.filter((notice) => notice.compliance!.tripActivated).length
    expect(activated).toBeLessThan(received.length)
    expect(await figure('Trip activated after payment')).toHaveTextContent(
      `${activated}Of ${received.length} paid`,
    )
  })

  it('has a tab for the register, post-payment compliance and related transactions', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/payments')
    const tabs = await screen.findByRole('tablist', { name: 'Payment views' })
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent?.replace(/\d+$/, '')),
    ).toEqual(['Demand Notice Register', 'Post-Payment Compliance', 'Related Transactions'])
    // Payment status is its own card, above the tabs.
    const status = await card('Payment Status')
    expect(screen.getByRole('region', { name: 'Payment views' })).not.toContainElement(status)
  })

  it('shows Payment Pending and Payment Received, and lists a status in the register', async () => {
    const received = expected().filter((notice) => notice.status === 'received')
    signInAs('admin@jrb.gov.ng')
    renderApp('/payments?range=30d')
    const panel = await card('Payment Status')
    expect(
      within(panel).getByRole('button', { name: 'View Payment Pending notices' }),
    ).toBeEnabled()
    await userEvent.click(
      within(panel).getByRole('button', { name: 'View Payment Received notices' }),
    )

    const register = await card('Demand Notice Register')
    expect(within(register).getByRole('combobox', { name: 'Payment status' })).toHaveValue(
      'received',
    )
    const table = within(register).getByRole('table', { name: 'Demand notices' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, received.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Payment Received')
  })

  it('opens the register filtered by the status the Overview links with', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/payments?range=30d&status=pending')
    const register = await card('Demand Notice Register')
    const table = within(register).getByRole('table', { name: 'Demand notices' })
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Payment Pending')
  })

  it('filters the register by the payment method the backend reported', async () => {
    const transfers = expected().filter((notice) => notice.method?.type === 'transfer')
    signInAs('admin@jrb.gov.ng')
    renderApp('/payments?range=30d')
    const register = await card('Demand Notice Register')
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Payment method' }),
      'transfer',
    )
    const table = within(register).getByRole('table', { name: 'Demand notices' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, transfers.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Bank transfer')
  })

  it('shows a notice’s vehicle, levy, penalty, total, reference, method, status and compliance', async () => {
    const notice = expected().find(
      (entry) => entry.status === 'received' && entry.compliance!.tripActivated && entry.method,
    )!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/payments?range=30d&notice=${notice.id}`)
    const dialog = await screen.findByRole('dialog', { name: `Demand notice ${notice.id}` })
    for (const text of [
      notice.plate,
      notice.violation.id,
      formatNaira(notice.amounts.levy!),
      formatNaira(notice.amounts.penalty!),
      formatNaira(notice.amounts.total!),
      notice.paymentReference ?? 'Not supplied by CHL',
      'Payment Received',
      'Trip Activated',
      notice.compliance!.tripReference!,
      ...notice.transactions.map((transaction) => transaction.reference),
    ]) {
      expect(dialog).toHaveTextContent(text)
    }
    // Read-only: nothing confirms, refunds, generates or edits.
    for (const name of [/confirm/i, /refund/i, /generate/i, /edit/i, /reconcil/i]) {
      expect(within(dialog).queryByRole('button', { name })).toBeNull()
    }
  })

  it('keeps payment received apart from trip activated', async () => {
    const notice = expected().find(
      (entry) => entry.status === 'received' && !entry.compliance!.tripActivated,
    )!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/payments?range=30d&notice=${notice.id}`)
    const dialog = await screen.findByRole('dialog', { name: `Demand notice ${notice.id}` })
    expect(dialog).toHaveTextContent('Payment Received')
    expect(dialog).toHaveTextContent('Not activated by CHL')
  })

  it('lists only paid notices under Post-Payment Compliance, with trip activation and tagging', async () => {
    const paid = expected().filter((notice) => notice.compliance)
    signInAs('admin@jrb.gov.ng')
    renderApp('/payments?range=30d&view=compliance')
    const panel = await card('Post-Payment Compliance')
    const table = within(panel).getByRole('table', { name: 'Paid notices' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, paid.length))
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(
      expect.arrayContaining([
        'Payment received (WAT)',
        'Trip activation',
        'Tagging process',
        'Compliance outcome',
      ]),
    )
  })

  it('lists the related transaction references and their times', async () => {
    const transactions = expected().flatMap((notice) => notice.transactions)
    signInAs('admin@jrb.gov.ng')
    renderApp('/payments?range=30d&view=transactions')
    const panel = await card('Related Transactions')
    const table = within(panel).getByRole('table', { name: 'Related transactions' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, transactions.length))
    expect(panel).toHaveTextContent('Payment')
    expect(panel).toHaveTextContent('Trip activation')
  })

  it('opens a notice’s case as a popup, without leaving the page', async () => {
    const notice = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/payments?range=30d')
    const table = await screen.findByRole('table', { name: 'Demand notices' })
    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${notice.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open the case' }))
    const dialog = await screen.findByRole('dialog', { name: `Case ${notice.violation.id}` })
    expect(dialog).toHaveTextContent(notice.id)
    expect(router.state.location.pathname).toBe('/payments')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
