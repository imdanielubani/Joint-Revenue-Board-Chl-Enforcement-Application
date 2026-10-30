import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { syncStateOf } from '@/features/verifications/verifications-display'
import { summarizeAuditTrail } from '@/mocks/mock-audit-api'
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
  summarizeAuditTrail({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).entries

describe('audit trail page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/audit')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Audit trail' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Audit trail' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('Read-only: no audit record is edited or deleted here.')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Agent' })).toBeInTheDocument()
  })

  it('keeps the audit trail from supervisors, whose access the backend restricts', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/audit')
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('counts the attempts, the unsuccessful ones, the violations issued and the pending uploads', async () => {
    const entries = expected()
    expect(entries.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/audit')
    expect(await figure('Verification attempts')).toHaveTextContent(
      `${entries.length}Successful and unsuccessful · ${new Set(entries.map((e) => e.agent.id)).size} agents`,
    )
    expect(await figure('Unsuccessful attempts')).toHaveTextContent(
      String(entries.filter((entry) => entry.attempt === 'unsuccessful').length),
    )
    expect(await figure('Violations issued')).toHaveTextContent(
      String(entries.filter((entry) => entry.actionTaken === 'violation_issued').length),
    )
    expect(await figure('Upload pending')).toHaveTextContent(
      String(entries.filter((entry) => syncStateOf(entry) === 'upload_pending').length),
    )
  })

  it('lists every attempt, newest first, with its audit fields', async () => {
    const entries = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/audit')
    const register = await card('Audit register')
    const table = within(register).getByRole('table', { name: 'Audit trail' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, entries.length))
    for (const [index, row] of bodyRows(table).entries()) {
      const entry = entries[index]!
      const cells = within(row).getAllByRole('cell')
      expect(cells[0]).toHaveTextContent(entry.reference)
      expect(cells[1]).toHaveTextContent(`${entry.agent.name}${entry.agent.id}`)
      expect(cells[1]).toHaveTextContent(entry.organization ?? 'No organization recorded')
      expect(cells[3]).toHaveTextContent(entry.plate)
      expect(cells[3]).toHaveTextContent(entry.vehicle.id ?? 'Not resolved by CHL')
      expect(cells[6]).toHaveTextContent(entry.location.name)
      expect(cells[7]).toHaveTextContent(
        entry.actionTaken === 'violation_issued'
          ? 'Violation issued'
          : entry.actionTaken === 'no_violation'
            ? 'No violation issued'
            : 'Not supplied',
      )
    }
  })

  it('finds an attempt by its reference, plate, agent or violation', async () => {
    const entry = expected().find((item) => item.violation)!
    signInAs('admin@jrb.gov.ng')
    renderApp('/audit')
    const register = await card('Audit register')
    await userEvent.type(within(register).getByRole('searchbox'), entry.violation!.id)
    const table = within(register).getByRole('table', { name: 'Audit trail' })
    expect(bodyRows(table)).toHaveLength(1)
    expect(bodyRows(table)[0]).toHaveTextContent(entry.reference)
  })

  it('narrows the register by method and action taken, keeping them in the address', async () => {
    const entries = expected()
    const rfid = entries.filter((entry) => entry.method === 'rfid')
    const issued = rfid.filter((entry) => entry.actionTaken === 'violation_issued')
    expect(issued.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/audit')
    const register = await card('Audit register')
    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Method' }),
      'rfid',
    )
    expect(router.state.location.search).toBe('?method=rfid')
    let table = within(register).getByRole('table', { name: 'Audit trail' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, rfid.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('RFID')

    await userEvent.selectOptions(
      within(register).getByRole('combobox', { name: 'Action taken' }),
      'violation_issued',
    )
    expect(router.state.location.search).toBe('?method=rfid&action=violation_issued')
    table = within(register).getByRole('table', { name: 'Audit trail' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, issued.length))
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Violation issued')
  })

  it('lists what a headline figure counts, keeping the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/audit?scope=la&range=30d')
    await userEvent.click((await figure('Unsuccessful attempts')).querySelector('a')!)
    expect(router.state.location.search).toBe('?scope=la&range=30d&attempt=unsuccessful')
    const register = await card('Audit register')
    expect(within(register).getByRole('combobox', { name: 'Attempt status' })).toHaveValue(
      'unsuccessful',
    )
  })

  it('opens an entry in a popup with every audit field', async () => {
    const entry = expected().find((item) => item.violation && item.tripId)!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/audit')
    const register = await card('Audit register')
    await userEvent.type(within(register).getByRole('searchbox'), entry.reference)
    const table = within(register).getByRole('table', { name: 'Audit trail' })
    await userEvent.click(
      within(table).getByRole('button', { name: `Actions for ${entry.reference}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View entry' }))

    const dialog = await screen.findByRole('dialog', { name: `Audit entry ${entry.reference}` })
    expect(router.state.location.search).toBe(`?entry=${entry.reference}`)
    const agent = within(dialog).getByRole('region', { name: 'Agent' })
    expect(agent).toHaveTextContent(`Agent ID${entry.agent.id}`)
    expect(agent).toHaveTextContent(`Agent name${entry.agent.name}`)
    const vehicle = within(dialog).getByRole('region', { name: 'Vehicle, trip and violation' })
    expect(vehicle).toHaveTextContent(`Vehicle plate${entry.plate}`)
    expect(vehicle).toHaveTextContent(`Trip reference${entry.tripId}`)
    expect(vehicle).toHaveTextContent(`Violation reference${entry.violation!.id}`)
    expect(vehicle).toHaveTextContent('Action takenViolation issued')
    expect(within(dialog).getByRole('region', { name: 'Location' })).toHaveTextContent(
      entry.location.name,
    )
    expect(within(dialog).getByRole('region', { name: 'Synchronization' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Audit records cannot be edited or deleted')

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('says when a linked entry is not in the area and period', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/audit?entry=VR-00000')
    expect(
      await screen.findByText(/VR-00000 is not in the audit trail for this area and period/),
    ).toBeInTheDocument()
  })
})
