import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeTrips } from '@/mocks/mock-trips-api'
import { lagosDay } from '@/shared/lib/dates'
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
  summarizeTrips({ scope: 'ng', range: '30d', ...presetPeriod('30d', lagosDay()) })

describe('trip monitoring page', () => {
  it('counts active trips, no active trip, no trip history and activation after payment', async () => {
    const data = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/trips?range=30d')

    expect(await screen.findByRole('heading', { level: 2, name: 'Trip monitoring' })).toBeVisible()
    const count = (result: string) => data.vehicles.filter((v) => v.result === result).length
    expect(await figure('Active trips')).toHaveTextContent(String(count('active_trip')))
    expect(await figure('No active trip')).toHaveTextContent(String(count('no_active_trip')))
    expect(await figure('No trip history')).toHaveTextContent(String(count('no_trip_history')))
    expect(await figure('Trips activated after payment')).toHaveTextContent(
      `Of ${data.postPayment.length} confirmed payments`,
    )
  })

  it('has a tab for each of the document’s six submodules', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/trips')
    const tabs = await screen.findByRole('tablist', { name: 'Trip monitoring submodules' })
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent?.replace(/\d+$/, '')),
    ).toEqual([
      'Active Trip Details',
      'No Active Trip',
      'Most Recent Previous Trip',
      'No Trip History',
      'Destination Detection',
      'Post-Payment Trip Status',
    ])
  })

  it('lists the active trips with every trip detail field, validity as CHL reported it', async () => {
    const data = expected()
    const active = data.vehicles.filter((v) => v.result === 'active_trip')
    signInAs('admin@jrb.gov.ng')
    renderApp('/trips?range=30d')
    const panel = await card('Active Trip Details')
    const table = within(panel).getByRole('table', { name: 'Active trips' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Transaction reference',
      'Plate',
      'Vehicle type',
      'Transaction type',
      'Trip start (WAT)',
      'Payment (WAT)',
      'Originating state and LGA',
      'Destination state and LGA',
      'Trip status',
      'Trip validity countdown',
      'Destination detection',
      'Actions',
    ])
    expect(bodyRows(table)).toHaveLength(Math.min(10, active.length))
    for (const row of bodyRows(table)) {
      expect(row).toHaveTextContent('Active')
      expect(row).toHaveTextContent('As reported by CHL')
    }
  })

  it('shows verified vehicles with no active trip and the most recent previous trip CHL returned', async () => {
    const noActive = expected().vehicles.filter((v) => v.result === 'no_active_trip')
    signInAs('admin@jrb.gov.ng')
    renderApp('/trips?range=30d&view=no-active')
    const panel = await card('No Active Trip')
    const table = within(panel).getByRole('table', { name: 'Vehicles with no active trip' })
    for (const vehicle of noActive.slice(0, 10)) {
      const row = within(table).getByText(vehicle.plate).closest('tr')!
      expect(row).toHaveTextContent(vehicle.previousTripReference ?? 'None returned by CHL')
      // The verification reference is plain text; it opens from the row's actions.
      expect(within(row).getByText(vehicle.verification.reference).closest('button, a')).toBeNull()
    }
  })

  it('opens a vehicle’s verification as a popup, without leaving the page', async () => {
    const vehicle = expected().vehicles.find((v) => v.result === 'no_active_trip')!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/trips?range=30d&view=no-active')
    const table = await screen.findByRole('table', { name: 'Vehicles with no active trip' })
    await userEvent.click(
      within(table).getByRole('button', { name: `Actions for ${vehicle.plate}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View verification' }))
    const dialog = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(dialog).toHaveTextContent(vehicle.verification.reference)
    expect(router.state.location.pathname).toBe('/trips')
  })

  it('opens a vehicle’s verifications as a popup, and a verification from it in place', async () => {
    const vehicle = expected().vehicles.find((v) => v.result === 'no_active_trip')!
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/trips?range=30d&view=no-active')
    const table = await screen.findByRole('table', { name: 'Vehicles with no active trip' })
    await userEvent.click(
      within(table).getByRole('button', { name: `Actions for ${vehicle.plate}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Vehicle verifications' }))

    const dialog = await screen.findByRole('dialog', { name: 'Vehicle verifications' })
    expect(within(dialog).getByRole('heading', { name: 'Vehicle identity' })).toBeInTheDocument()
    const list = within(dialog).getByRole('table', { name: `Verifications of ${vehicle.plate}` })
    const row = within(list).getByText(vehicle.verification.reference).closest('tr')!
    await userEvent.click(
      within(row).getByRole('button', { name: `Actions for ${vehicle.verification.reference}` }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View details' }))

    const details = await screen.findByRole('dialog', { name: 'Verification details' })
    expect(details).toHaveTextContent(vehicle.verification.reference)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    // And back: the verification's "Vehicle identity" shows the vehicle's verifications again.
    await userEvent.click(within(details).getByRole('button', { name: 'Vehicle identity' }))
    expect(await screen.findByRole('dialog', { name: 'Vehicle verifications' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/trips')
  })

  it('opens the vehicle’s verifications from a trip’s details, in place of the trip', async () => {
    const trip = expected().trips.find((t) => expected().vehicles.some((v) => v.plate === t.plate))!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/trips?range=30d&trip=${trip.reference}`)
    const details = await screen.findByRole('dialog', { name: 'Trip details' })
    await userEvent.click(within(details).getByRole('button', { name: 'Vehicle verifications' }))

    const dialog = await screen.findByRole('dialog', { name: 'Vehicle verifications' })
    expect(dialog).toHaveTextContent(trip.plate)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('opens a paid violation’s case as a popup; payments wait for the Payments module', async () => {
    const payment = expected().postPayment[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp('/trips?range=30d&view=post-payment')
    const table = await screen.findByRole('table', { name: 'Confirmed payments' })
    await userEvent.click(
      within(table).getByRole('button', { name: `Actions for ${payment.noticeId}` }),
    )
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Open the payment' })).toBeNull()
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Open the case' }))
    const dialog = await screen.findByRole('dialog', { name: `Case ${payment.violationId}` })
    expect(dialog).toHaveTextContent(payment.noticeId)

    // From the case, its evidence opens in its own popup, in place of the case.
    await userEvent.click(within(dialog).getByRole('button', { name: 'View evidence' }))
    expect(await screen.findByRole('dialog', { name: /^Evidence EV-/ })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('shows transaction references as plain text; a trip’s details open from its row’s actions', async () => {
    const vehicle = expected().vehicles.find((v) => v.result === 'active_trip')!
    const reference = vehicle.activeTripReference!
    signInAs('admin@jrb.gov.ng')
    renderApp('/trips?range=30d')
    const panel = await card('Active Trip Details')
    const table = within(panel).getByRole('table', { name: 'Active trips' })
    const cell = within(table).getByText(reference)
    expect(cell.closest('button, a')).toBeNull()

    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${reference}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View trip details' }))
    const dialog = await screen.findByRole('dialog', { name: 'Trip details' })
    expect(dialog).toHaveTextContent(reference)
  })

  it('opens a trip’s details, with no validity worked out by the dashboard', async () => {
    const trip = expected().trips.find((entry) => entry.status === 'active')!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/trips?range=30d&trip=${trip.reference}`)
    const dialog = await screen.findByRole('dialog', { name: 'Trip details' })
    for (const term of [
      'Transaction reference',
      'Transaction date',
      'Transaction status',
      'Payment date/time',
      'Terminal ID',
      'Contact number',
      'Vehicle plate number',
      'Vehicle type',
      'Transaction type (trip type)',
      'Trip status',
      'Trip start date/time',
      'Trip validity countdown',
      'Origin state',
      'Origin LGA',
      'Destination state',
      'Destination LGA',
      'Channel',
      'Channel type',
    ]) {
      expect(within(dialog).getByText(term)).toBeInTheDocument()
    }
    expect(dialog).toHaveTextContent(trip.plate)
    expect(dialog).toHaveTextContent(trip.terminalId!)
    expect(dialog).toHaveTextContent(trip.channel!)
    expect(dialog).toHaveTextContent('As reported by CHL')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('shows trip activation or compliance status after confirmed payment, as CHL records it', async () => {
    const payments = expected().postPayment
    signInAs('admin@jrb.gov.ng')
    renderApp('/trips?range=30d&view=post-payment')
    const panel = await card('Post-Payment Trip Status')
    const table = within(panel).getByRole('table', { name: 'Confirmed payments' })
    for (const payment of payments.slice(0, 10)) {
      const row = within(table).getByText(payment.noticeId).closest('tr')!
      expect(row).toHaveTextContent(
        payment.tripActivated ? 'Trip activated' : 'Not activated by CHL',
      )
      expect(row).toHaveTextContent(payment.complianceStatus ?? 'Not updated by CHL')
    }
  })

  it('shows CHL’s own message for a closed trip, word for word', async () => {
    const closed = expected().trips.find((entry) => entry.statusMessage !== null)!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/trips?range=30d&trip=${closed.reference}`)
    const dialog = await screen.findByRole('dialog', { name: 'Trip details' })
    expect(dialog).toHaveTextContent('Trip Closed')
    expect(dialog).toHaveTextContent(closed.statusMessage!)
  })

  it('opens the vehicle’s submodule for a plate from a link', async () => {
    const vehicle = expected().vehicles.find((v) => v.result === 'no_active_trip')!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/trips?range=30d&plate=${vehicle.plate}`)
    const panel = await card('No Active Trip')
    const table = within(panel).getByRole('table', { name: 'Vehicles with no active trip' })
    expect(bodyRows(table)).toHaveLength(1)
    expect(bodyRows(table)[0]).toHaveTextContent(vehicle.plate)
  })
})
