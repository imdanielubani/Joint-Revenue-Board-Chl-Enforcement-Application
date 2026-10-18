import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { summarizeCommandCentre } from '@/mocks/mock-command-centre-api'
import { renderApp, signInAs } from '@/test/render-app'
import { feedTitle } from './command-centre-display'

const card = (title: string) => screen.findByRole('region', { name: title })

describe('command centre page', () => {
  it('shows the open cases and the feed for the default window', async () => {
    const sample = summarizeCommandCentre({ scope: 'ng', window: '24h' })
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre')

    expect(await screen.findByRole('heading', { level: 2, name: 'Command centre' })).toBeVisible()
    const figures = await screen.findByRole('list', { name: 'Headline figures' })
    const cases = within(figures).getByText('Cases needing attention').closest('li')!
    expect(within(cases).getByText(String(sample.cases.unresolved))).toBeInTheDocument()
    expect(within(cases).getByRole('link')).toHaveAttribute('href', '/violations')
    expect(screen.getByText(/National scope · Last 24 hours/)).toBeInTheDocument()

    const feed = await card('Operational activity feed')
    expect(within(feed).getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true')
    const entries = within(feed).getAllByRole('button', { pressed: false })
    expect(entries.length).toBeGreaterThan(0)
  })

  it('shows the chosen entry in the incident context', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre?window=7d')
    const feed = await card('Operational activity feed')
    await userEvent.click(within(feed).getByRole('tab', { name: /Violations/ }))

    const entry = within(feed).getAllByRole('button', { pressed: false })[0]
    if (!entry) throw new Error('expected a violation in the feed')
    const title = within(entry).getByText(/^Violation .+ issued$/).textContent ?? ''
    await userEvent.click(entry)

    expect(entry).toHaveAttribute('aria-pressed', 'true')
    const context = await card('Incident context')
    expect(within(context).getByText(title)).toBeInTheDocument()
    expect(within(context).getByRole('link', { name: 'Open the case' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/violations\?case=VIO-/),
    )
  })

  it('keeps the time window in the address', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre')
    await card('Operational activity feed')
    await userEvent.selectOptions(screen.getByLabelText('Time window'), 'Last 7 days')
    expect(await screen.findByText(/National scope · Last 7 days/)).toBeInTheDocument()
  })

  it('lists loaded and empty reports, and shows one in the incident context', async () => {
    const sample = summarizeCommandCentre({ scope: 'ng', window: '7d' }).loadReports
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre?window=7d')
    const loads = await card('Loaded / empty reports')
    expect(within(loads).getByRole('tab', { name: /^All/ })).toHaveTextContent(
      String(sample.loaded + sample.empty),
    )

    await userEvent.click(within(loads).getByRole('tab', { name: /^Empty/ }))
    const entries = within(loads).getAllByRole('button')
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) expect(entry).toHaveTextContent('Empty')

    const plate = sample.items.find((item) => item.load === 'empty')!.plate!
    await userEvent.click(entries[0]!)
    const context = await card('Incident context')
    expect(within(context).getByText('Reported empty')).toBeInTheDocument()
    expect(within(context).getByText(plate)).toBeInTheDocument()
  })

  it('raises open SOS above the feed and shows its details', async () => {
    const sos = summarizeCommandCentre({ scope: 'ng', window: '24h' }).sos!
    const open = sos.items.find((item) => item.sos?.status === 'open')!
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre')

    const alert = await screen.findByText(/open SOS notification/)
    expect(alert).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show details' }))
    const context = await card('Incident context')
    expect(within(context).getByText(`SOS from ${open.agent.name}`)).toBeInTheDocument()
    expect(within(context).getByText(open.sos!.message!)).toBeInTheDocument()
    expect(within(context).getByText(/not a live position/)).toBeInTheDocument()

    const panel = await card('SOS monitoring')
    expect(within(panel).getAllByText('Open').length).toBe(Math.min(sos.open, 4))
  })

  it('shows recorded locations on a map, or as a list', async () => {
    const sample = summarizeCommandCentre({ scope: 'ng', window: '24h' })
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre')
    const locations = await card('Recorded locations')

    expect(within(locations).getByRole('tab', { name: 'Map' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const map = await within(locations).findByRole('region', {
      name: 'Map of recorded event locations',
    })
    // One circle per enforcement point with a position.
    await vi.waitFor(() =>
      expect(map.querySelectorAll('path.leaflet-interactive')).toHaveLength(
        sample.locations.filter((location) => location.position).length,
      ),
    )

    await userEvent.click(within(locations).getByRole('tab', { name: 'List' }))
    for (const location of sample.locations) {
      expect(within(locations).getByText(location.name)).toBeInTheDocument()
    }
  })

  it('opens a location from the map and narrows the feed to its entries', async () => {
    // jsdom lays nothing out; give the map a size so Leaflet can place the circles.
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(680)
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(340)
    onTestFinished(() => {
      width.mockRestore()
      height.mockRestore()
    })
    const sample = summarizeCommandCentre({ scope: 'ng', window: '24h' })
    // The card lists the busiest first, so the first circle drawn is the busiest point.
    const busiest = [...sample.locations].sort(
      (a, b) => b.events - a.events || (b.lastEventAt ?? '').localeCompare(a.lastEventAt ?? ''),
    )[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre')
    const locations = await card('Recorded locations')
    const map = await within(locations).findByRole('region', {
      name: 'Map of recorded event locations',
    })
    const circle = await vi.waitFor(() => {
      const found = map.querySelector('path.leaflet-interactive')
      if (!found) throw new Error('no circle yet')
      return found
    })

    // A plain click with a position: Leaflet reads where every mouse event lands.
    fireEvent.click(circle, { clientX: 340, clientY: 170 })
    const show = await within(map).findByRole('button', { name: 'Show its entries in the feed' })
    expect(within(map).getByText(busiest.name)).toBeInTheDocument()
    expect(
      within(map).getByRole('link', { name: 'Open in geographical monitoring' }),
    ).toHaveAttribute('href', `/geography?location=${busiest.id}`)

    await userEvent.click(show)
    const feed = await card('Operational activity feed')
    expect(within(feed).getByRole('status')).toHaveTextContent(
      `Showing entries from ${busiest.name}`,
    )
    // The feed's entries are the buttons that can be chosen (aria-pressed).
    const entries = [...feed.querySelectorAll('button[aria-pressed]')]
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) expect(entry).toHaveTextContent(busiest.name)

    await userEvent.click(within(feed).getByRole('button', { name: 'Show all locations' }))
    expect(within(feed).queryByRole('status')).not.toBeInTheDocument()
  })

  it('says it is not live tracking or dispatch', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/command-centre')
    expect(await screen.findByText(/does not dispatch agents/)).toBeInTheDocument()
    expect(await card('Recorded locations')).toHaveTextContent('not live tracking')
  })
})

describe('feedTitle', () => {
  it('keeps payment received apart from trip activated', () => {
    const base = summarizeCommandCentre({ scope: 'ng', window: '7d' }).feed[0]!
    const paid = {
      ...base,
      kind: 'payment',
      payment: { noticeId: 'DN-1', status: 'received', tripActivated: false },
    }
    expect(feedTitle(paid)).toBe('Payment received · trip not yet activated')
  })
})
