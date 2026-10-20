import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeVerifications } from '@/mocks/mock-verifications-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'
import { OUTCOME_ORDER, syncStateOf } from './verifications-display'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}
/** The rows on a register's first page, header row left out. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)

/** What the page must show nationally, last 14 days. */
const expected = () =>
  summarizeVerifications({
    scope: 'ng',
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).records

describe('verifications and E-Tags page', () => {
  it('counts the records, unavailable verifications, cached or offline results and pending uploads', async () => {
    const records = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/verifications')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Verifications & E-Tags' }),
    ).toBeVisible()
    expect(await figure('Verification records')).toHaveTextContent(String(records.length))
    const unavailable = await figure('Verification unavailable')
    expect(unavailable).toHaveTextContent(
      String(records.filter((r) => r.result === 'verification_unavailable').length),
    )
    expect(unavailable).toHaveTextContent('Not equivalent to No Active Trip')
    expect(within(unavailable).getByRole('link')).toHaveAttribute(
      'href',
      '/verifications?view=records&outcome=verification_unavailable',
    )
    expect(await figure('Cached / offline-origin')).toHaveTextContent(
      String(records.filter((r) => r.provenance !== 'live_backend').length),
    )
    expect(await figure('Pending synchronization')).toHaveTextContent(
      String(records.filter((r) => syncStateOf(r) === 'upload_pending').length),
    )
  })

  it('keeps E-Tag results apart from scan errors, each with its own count', async () => {
    const records = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/verifications')
    const etags = await card('E-Tag results')
    for (const [label, result] of [
      ['Valid E-Tag', 'valid'],
      ['Missing E-Tag', 'missing'],
      ['Invalid / fake E-Tag', 'invalid'],
      ['Tag-vehicle mismatch', 'mismatch'],
    ] as const) {
      const count = records.filter((r) => r.etag === result).length
      expect(
        within(etags).getByRole('button', { name: `${label}: ${count} records. List them` }),
      ).toBeInTheDocument()
    }
    expect(etags).toHaveTextContent(
      'A failed RFID read does not establish that an E-Tag is missing.',
    )
  })

  it('lists a method’s records when its row is chosen in Verification methods', async () => {
    const rfid = expected().filter((r) => r.method === 'rfid')
    signInAs('admin@jrb.gov.ng')
    renderApp('/verifications')
    const methods = await card('Verification methods')
    await userEvent.click(within(methods).getByRole('button', { name: /^RFID: / }))

    const register = await card('Verification record register')
    expect(within(register).getByRole('combobox', { name: 'Method' })).toHaveValue('rfid')
    expect(register).toHaveTextContent(`${rfid.length} matching verification records`)
    const table = within(register).getByRole('table', { name: 'Verification records' })
    for (const row of bodyRows(table)) expect(row).toHaveTextContent('RFID')
  })

  it('shows the verification cells as other modules do, and never a raw RFID value', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/verifications')
    const register = await card('Verification record register')
    const table = within(register).getByRole('table', { name: 'Verification records' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Reference',
      'Plate',
      'Verification method',
      'Verification result',
      'E-Tag',
      'Agent',
      'Recorded (WAT)',
      'Location',
      'Source',
      'Sync',
      'Attempt status',
      'Action taken',
      'Actions',
    ])
    expect(register).not.toHaveTextContent(/tag id|epc|tid/i)
  })

  it('opens a verification’s details: method, outcome, vehicle, trip, action, payment and sync', async () => {
    const withPayment = expected().find((r) => r.payment !== null)!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/verifications?q=${withPayment.reference}`)
    const register = await card('Verification record register')
    await userEvent.click(within(register).getByRole('button', { name: withPayment.reference }))

    const dialog = await screen.findByRole('dialog', { name: 'Verification details' })
    for (const heading of [
      'Verification',
      'Vehicle and trip',
      'Action',
      'Record and synchronization',
    ]) {
      expect(within(dialog).getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(dialog).toHaveTextContent(withPayment.violation!.id)
    expect(dialog).toHaveTextContent(withPayment.payment!.id)
    expect(within(dialog).getByRole('link', { name: 'Open the payment' })).toHaveAttribute(
      'href',
      `/payments?notice=${withPayment.payment!.id}`,
    )

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('opens a verification named in the address, as other pages link to it', async () => {
    const record = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/verifications?ref=${record.reference}`)
    const dialog = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(dialog).toHaveTextContent(record.plate)
  })

  it('looks up a plate in Vehicle identity from a link', async () => {
    const record = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/verifications?plate=${record.plate}`)
    const vehicles = await card('Vehicle identity')
    expect(screen.getByRole('tab', { name: /Vehicle identity/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const table = within(vehicles).getByRole('table', { name: 'Vehicles verified' })
    const rows = bodyRows(table)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent(record.plate)
    expect(rows[0]).toHaveTextContent(record.vehicle.id ?? 'Not resolved')
  })

  it('lists every outcome, with Verification Unavailable never counted as No Active Trip', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/verifications?view=outcomes')
    const outcomes = await card('Verification outcomes')
    expect(within(outcomes).getAllByRole('listitem')).toHaveLength(OUTCOME_ORDER.length)
    expect(outcomes).toHaveTextContent('A network failure is not “No Active Trip.”')
  })

  it('lists only the records still uploading or received late under Source & synchronization', async () => {
    const attention = expected().filter((r) => syncStateOf(r) !== 'synced')
    signInAs('admin@jrb.gov.ng')
    renderApp('/verifications?view=sync')
    const panel = await card('Source & synchronization')
    const table = within(panel).getByRole('table', {
      name: 'Records still uploading or received late',
    })
    expect(bodyRows(table)).toHaveLength(Math.min(10, Math.max(1, attention.length)))
    for (const record of attention.slice(0, 10)) expect(table).toHaveTextContent(record.reference)
  })
})
