import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { pendingActions } from '@/features/verifications/verifications-display'
import { historyCsvRows } from './history-export'
import { summarizeHistory } from '@/mocks/mock-history-api'
import { addDays, lagosDay } from '@/shared/lib/dates'
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

  it('narrows the register by completion status and payment request, keeping them in the address', async () => {
    const records = expected()
    const completed = records.filter((record) => record.attempt === 'successful')
    const pendingPayment = completed.filter((record) => record.payment?.status === 'pending')
    expect(pendingPayment.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/history')
    const register = await card('History register')
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Completion status' }),
      'successful',
    )
    expect(router.state.location.search).toBe('?completion=successful')
    let table = within(register).getByRole('table', { name: 'Verification history' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, completed.length))

    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Payment request' }),
      'pending',
    )
    expect(router.state.location.search).toBe('?completion=successful&payment=pending')
    table = within(register).getByRole('table', { name: 'Verification history' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, pendingPayment.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Payment pending')
  })

  it('keeps only the attempts with pending actions, or with no violation', async () => {
    const records = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/history?pending=yes')
    const register = await card('History register')
    let table = within(register).getByRole('table', { name: 'Verification history' })
    const pending = records.filter((record) => pendingActions(record).length > 0)
    expect(bodyRows(table)).toHaveLength(Math.min(10, pending.length))
    for (const row of bodyRows(table))
      expect(within(row).getAllByRole('cell')[8]).not.toHaveTextContent('None')

    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Pending actions' }),
      '',
    )
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Linked violation' }),
      'none',
    )
    table = within(register).getByRole('table', { name: 'Verification history' })
    const unlinked = records.filter((record) => !record.violation)
    expect(bodyRows(table)).toHaveLength(Math.min(10, unlinked.length))
  })

  it('lists what a headline figure counts, keeping the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/history?scope=la&range=30d')
    await userEvent.click((await figure('Payment requests')).querySelector('a')!)
    expect(router.state.location.search).toBe('?scope=la&range=30d&payment=any')
    const register = await card('History register')
    expect(within(register).getByRole('combobox', { name: 'Payment request' })).toHaveValue('any')
    const table = within(register).getByRole('table', { name: 'Verification history' })
    for (const row of bodyRows(table)) {
      expect(within(row).getAllByRole('cell')[7]).not.toHaveTextContent('None')
    }

    await userEvent.click((await figure('Verification attempts')).querySelector('a')!)
    expect(router.state.location.search).toBe('?scope=la&range=30d&completion=unsuccessful')
  })

  it('opens a record’s details from its row, keeping it in the address', async () => {
    const record = expected().find((item) => item.violation && item.payment)!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp(`/history?completion=${record.attempt}`)
    const register = await card('History register')
    await userEvent.type(within(register).getByRole('searchbox'), record.reference)
    await userEvent.click(
      within(register).getByRole('button', { name: `Actions for ${record.reference}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open record details' }))
    expect(router.state.location.search).toBe(
      `?completion=${record.attempt}&record=${record.reference}`,
    )
    const details = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(details).toHaveTextContent(record.violation!.id)
    expect(details).toHaveTextContent(record.payment!.id)
    await userEvent.keyboard('{Escape}')
    expect(router.state.location.search).toBe(`?completion=${record.attempt}`)
  })

  it('opens a record’s details from a shared address', async () => {
    const record = expected()[2]!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/history?record=${record.reference}`)
    const details = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(details).toHaveTextContent(record.plate)
  })

  it('says when an opened record is outside the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/history?record=VR-00001')
    expect(
      await screen.findByText(
        'VR-00001 is not in the verification history for this area and period. Choose another area or a longer period to find it.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Verification details' })).not.toBeInTheDocument()
  })

  it('opens the linked case and payment request from an attempt’s row', async () => {
    const record = expected().find((item) => item.violation && item.payment)!
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    const register = await card('History register')
    await userEvent.type(within(register).getByRole('searchbox'), record.reference)
    const actions = () =>
      within(register).getByRole('button', { name: `Actions for ${record.reference}` })

    await userEvent.click(actions())
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    expect(items).toEqual(
      expect.arrayContaining([
        'Open record details',
        'View case',
        'View demand notice',
        'View evidence',
        'View agent',
      ]),
    )
    expect(items).not.toContain('Verification details')
    await userEvent.click(screen.getByRole('menuitem', { name: 'View case' }))
    expect(
      await screen.findByRole('dialog', { name: `Case ${record.violation!.id}` }),
    ).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(actions())
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View demand notice' }))
    expect(
      await screen.findByRole('dialog', { name: new RegExp(record.payment!.id) }),
    ).toBeInTheDocument()
  })

  describe('export', () => {
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
    afterEach(() => {
      URL.createObjectURL = original.create
      URL.revokeObjectURL = original.revoke
    })

    it('saves the attempts the register shows as a CSV file', async () => {
      const files: Blob[] = []
      URL.createObjectURL = (blob: Blob) => {
        files.push(blob)
        return 'blob:history'
      }
      URL.revokeObjectURL = vi.fn()
      const linked = expected().filter((record) => record.violation)
      signInAs('admin@jrb.gov.ng')
      renderApp('/history?violation=linked')
      await card('History register')
      const hero = screen.getByRole('region', { name: 'Verification history' })
      await userEvent.click(within(hero).getByRole('button', { name: 'Export records' }))

      expect(files).toHaveLength(1)
      const text = await files[0]!.text()
      const header = text.replace(/^\uFEFF/, '').split('\r\n')[0]
      expect(header).toBe(historyCsvRows([])[0]!.join(','))
      expect(text.split('\r\n')).toHaveLength(linked.length + 1)
      expect(
        await screen.findByText(`${linked.length} verification attempts saved as a CSV file.`),
      ).toBeInTheDocument()
    })
  })

  it('says the 30-day default is an agent’s, not a limit on administrator access', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/history')
    const note = (await screen.findByText('Not limited to the last 30 days.')).closest('aside')!
    expect(note).toHaveTextContent('apply to an agent’s personal history')
    expect(note).toHaveTextContent('not a 30-day limit on administrator access')
    expect(note).toHaveTextContent('No record is edited here.')
  })

  describe('beyond 30 days', () => {
    it('lists attempts older than 30 days over the last 90 days', async () => {
      const today = lagosDay()
      const records = summarizeHistory({
        scope: 'ng',
        range: '90d',
        ...presetPeriod('90d', today),
        agentId: null,
        organization: null,
      }).records
      const cutoff = Date.parse(`${addDays(today, -30)}T00:00:00+01:00`)
      const older = records.find((record) => Date.parse(record.recordedAt) < cutoff)!
      expect(older).toBeDefined()
      signInAs('admin@jrb.gov.ng')
      renderApp(`/history?range=90d&record=${older.reference}`)
      const details = await screen.findByRole('dialog', { name: 'Verification details' })
      expect(details).toHaveTextContent(older.reference)
      expect(await figure('Verification attempts')).toHaveTextContent(String(records.length))
    })

    it('lists attempts over a custom period longer than 30 days', async () => {
      const today = lagosDay()
      const from = addDays(today, -59)
      const records = summarizeHistory({
        scope: 'ng',
        range: 'custom',
        from,
        to: today,
        agentId: null,
        organization: null,
      }).records
      signInAs('admin@jrb.gov.ng')
      renderApp(`/history?range=custom&from=${from}&to=${today}`)
      expect(await figure('Verification attempts')).toHaveTextContent(String(records.length))
      const register = await card('History register')
      const table = within(register).getByRole('table', { name: 'Verification history' })
      expect(bodyRows(table)).toHaveLength(Math.min(10, records.length))
    })
  })

  it('is where a verification’s details lead, over a period that holds it', async () => {
    const record = expected()[1]!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp(`/verifications?ref=${record.reference}`)
    const details = await screen.findByRole('dialog', { name: 'Verification details' })
    await userEvent.click(
      within(details).getByRole('link', { name: 'Open in verification history' }),
    )
    expect(router.state.location.pathname).toBe('/history')
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('range')).toBe('custom')
    expect(params.get('to')).toBe(lagosDay())
    expect(params.get('record')).toBe(record.reference)
    await screen.findByRole('heading', { level: 1, name: 'Verification history' })
    const opened = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(opened).toHaveTextContent(record.reference)
    expect(
      within(opened).queryByRole('link', { name: 'Open in verification history' }),
    ).not.toBeInTheDocument()
  })

  it('lists an agent’s attempts from their activity page, over the same area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/agents/JRB-AG-0142?scope=la&range=30d')
    const hero = await screen.findByRole('region', { name: /Tunde Okafor/ })
    await userEvent.click(within(hero).getByRole('link', { name: 'Verification history' }))
    expect(router.state.location.pathname).toBe('/history')
    expect(router.state.location.search).toBe('?scope=la&range=30d&agent=JRB-AG-0142')
    expect(await screen.findByRole('combobox', { name: 'Agent' })).toHaveValue('JRB-AG-0142')
    const register = await card('History register')
    const table = within(register).getByRole('table', { name: 'Verification history' })
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('JRB-AG-0142')
  })
})
