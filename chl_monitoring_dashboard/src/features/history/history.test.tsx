import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { pendingActions } from '@/features/verifications/verifications-display'
import { summarizeHistory } from '@/mocks/mock-history-api'
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
  summarizeHistory({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).records

describe('verification history page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Verification history' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Verification history' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('whether each was completed, the action taken')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Agent' })).toBeInTheDocument()
  })

  it('opens for supervisors as well as administrators', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/history')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Verification history' }),
    ).toBeInTheDocument()
  })

  it('is kept from users the backend gives no access to it', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/history')
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('counts the attempts, their completion, the linked violations, payment requests and pending actions', async () => {
    const records = expected()
    expect(records.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    const completed = records.filter((record) => record.attempt === 'successful').length
    const notCompleted = records.filter((record) => record.attempt === 'unsuccessful').length
    expect(await figure('Verification attempts')).toHaveTextContent(
      `${records.length}${completed} completed · ${notCompleted} not completed`,
    )
    expect(await figure('Linked violations')).toHaveTextContent(
      String(records.filter((record) => record.violation).length),
    )
    expect(await figure('Payment requests')).toHaveTextContent(
      String(records.filter((record) => record.payment).length),
    )
    expect(await figure('Pending actions')).toHaveTextContent(
      String(records.filter((record) => pendingActions(record).length > 0).length),
    )
  })

  it('lists every attempt, newest first, with what followed it', async () => {
    const records = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    const register = await card('History register')
    const table = within(register).getByRole('table', { name: 'Verification history' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, records.length))
    for (const [index, row] of bodyRows(table).entries()) {
      const record = records[index]!
      const cells = within(row).getAllByRole('cell')
      expect(cells[0]).toHaveTextContent(record.reference)
      expect(cells[1]).toHaveTextContent(`${record.agent.name}${record.agent.id}`)
      expect(cells[2]).toHaveTextContent(record.plate)
      expect(cells[4]).toHaveTextContent(
        record.attempt === 'successful'
          ? 'Successful'
          : record.attempt === 'unsuccessful'
            ? 'Unsuccessful'
            : 'Not supplied',
      )
      expect(cells[6]).toHaveTextContent(record.violation?.id ?? 'None')
      expect(cells[7]).toHaveTextContent(record.payment?.id ?? 'None')
      expect(cells[8]).toHaveTextContent(pendingActions(record).join(' · ') || 'None')
    }
  })

  it('finds an attempt by its reference, plate, violation or payment request', async () => {
    const record = expected().find((item) => item.payment)!
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    const register = await card('History register')
    await userEvent.type(within(register).getByRole('searchbox'), record.payment!.id)
    const table = within(register).getByRole('table', { name: 'Verification history' })
    expect(bodyRows(table)).toHaveLength(1)
    expect(bodyRows(table)[0]).toHaveTextContent(record.reference)
  })
})
