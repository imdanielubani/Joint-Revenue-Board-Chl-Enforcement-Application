import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { syncStateOf } from '@/features/verifications/verifications-display'
import { summarizeSync } from '@/mocks/mock-sync-api'
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
  summarizeSync({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).records

describe('synchronization page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/sync')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Synchronization' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Synchronization' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('Received data only. Read-only.')
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Agent' })).toBeInTheDocument()
  })

  it('is kept from users the backend gives no access to it', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/sync')
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('counts the records received, made offline, received late and still uploading evidence', async () => {
    const records = expected()
    const state = (value: string) => records.filter((record) => syncStateOf(record) === value)
    signInAs('admin@jrb.gov.ng')
    renderApp('/sync')
    expect(await figure('Records received')).toHaveTextContent(
      `${records.length}${state('synced').length} synced · ${state('received_late').length} received late`,
    )
    expect(await figure('Offline-origin records')).toHaveTextContent(
      String(records.filter((record) => record.provenance === 'offline_origin').length),
    )
    expect(await figure('Received late')).toHaveTextContent(String(state('received_late').length))
    expect(await figure('Evidence uploading')).toHaveTextContent(
      String(state('upload_pending').length),
    )
  })

  it('lists the received records with their source, received time and synchronization', async () => {
    const [first] = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/sync')
    const register = await card('Synchronization register')
    const table = within(register).getByRole('table', { name: 'Received records' })
    const row = bodyRows(table)[0]!
    expect(row).toHaveTextContent(first!.reference)
    expect(row).toHaveTextContent(first!.plate)
    expect(row).toHaveTextContent(first!.agent.name)
  })

  it('opens the register filtered to the offline-origin records from their figure', async () => {
    const offline = expected().filter((record) => record.provenance === 'offline_origin')
    expect(offline.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/sync')
    const note = within(await figure('Offline-origin records')).getByRole('link')
    await userEvent.click(note)
    expect(new URLSearchParams(router.state.location.search).get('source')).toBe('offline_origin')
    expect(await screen.findByRole('combobox', { name: 'Recorded source' })).toHaveTextContent(
      'Offline-origin',
    )
    const table = within(await card('Synchronization register')).getByRole('table', {
      name: 'Received records',
    })
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('Offline-origin')
  })

  it('filters the register by synchronization', async () => {
    const late = expected().filter((record) => syncStateOf(record) === 'received_late')
    expect(late.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/sync?sync=received_late')
    const table = within(await card('Synchronization register')).getByRole('table', {
      name: 'Received records',
    })
    const rows = bodyRows(table)
    expect(rows).toHaveLength(Math.min(late.length, 10))
    for (const row of rows) expect(row).toHaveTextContent('Received late')
  })

  it('opens a record’s details from its row', async () => {
    const [first] = expected()
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/sync')
    const register = await card('Synchronization register')
    await userEvent.click(
      within(register).getByRole('button', { name: `Actions for ${first!.reference}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open record details' }))
    const dialog = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(dialog).toHaveTextContent(first!.reference)
    expect(new URLSearchParams(router.state.location.search).get('record')).toBe(first!.reference)
  })

  it('says it shows received data only, not what is still on an offline phone', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/sync')
    expect(await screen.findByText('Received data only.')).toBeInTheDocument()
    expect(
      screen.getByText(/cannot know about actions still stored only on an offline phone/),
    ).toBeInTheDocument()
  })
})
