import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockSearchApi, summarizeSearch } from '@/mocks/mock-search-api'
import { renderApp, signInAs } from '@/test/render-app'

afterEach(() => vi.restoreAllMocks())

const hero = () => screen.findByRole('region', { name: 'Search results' })

describe('search results page', () => {
  it('opens on the banner, naming the query and the area searched', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/search?q=KJA-482-XY')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Search results' }),
    ).toBeInTheDocument()
    const banner = await hero()
    expect(banner).toHaveTextContent('JRB CHL/Workspace')
    expect(banner).toHaveTextContent('Results for “KJA-482-XY” in National')
    expect(within(banner).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('searches only the user’s own areas', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/search?q=KJA-482-XY')
    expect(await hero()).toHaveTextContent('in Lagos state')
  })

  it('asks for a query when there is none', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/search')
    expect(
      await screen.findByText('Type a plate, agent or reference in the search box.'),
    ).toBeInTheDocument()
  })

  it('asks for more when the query is too short to search', async () => {
    const search = vi.spyOn(mockSearchApi, 'search')
    signInAs('admin@jrb.gov.ng')
    renderApp('/search?q=k')
    expect(
      await screen.findByText('Type at least 2 characters of a plate, agent or reference.'),
    ).toBeInTheDocument()
    expect(search).not.toHaveBeenCalled()
  })

  it('says what was found', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/search?q=tunde')
    expect(await screen.findByText('1 agent')).toBeInTheDocument()
  })

  it('says when nothing matches', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/search?q=ZZZ-999-ZZ')
    expect(
      await screen.findByText(
        'Nothing matches “ZZZ-999-ZZ” in National. Check the plate or reference, or search for part of it.',
      ),
    ).toBeInTheDocument()
  })

  it('offers a retry when the search fails', async () => {
    vi.spyOn(mockSearchApi, 'search').mockRejectedValue(new Error('Network down'))
    signInAs('admin@jrb.gov.ng')
    renderApp('/search?q=KJA-482-XY')
    expect(await screen.findByRole('button', { name: /try again|retry/i })).toBeInTheDocument()
  })

  it('lists matching vehicles, leading to their vehicle identity', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/search?q=kja 482')
    const vehicles = await screen.findByRole('list', { name: 'Vehicles' })
    const link = within(vehicles).getByRole('link', { name: /KJA-482-XY/ })
    expect(link).toHaveAttribute('href', '/verifications?plate=KJA-482-XY')
    expect(link).toHaveTextContent(/\d+ verifications · last/)
  })

  it('lists matching agents, leading to their page', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/search?q=tunde')
    const agents = await screen.findByRole('list', { name: 'Agents' })
    const link = within(agents).getByRole('link', { name: /Tunde Okafor/ })
    expect(link).toHaveAttribute('href', '/agents/JRB-AG-0142')
    expect(link).toHaveTextContent('JRB-AG-0142 · Zone 1')
  })

  it('shows results without a link where the user may not open that module', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/search?q=tunde')
    const agents = await screen.findByRole('list', { name: 'Agents' })
    expect(within(agents).getByText('Tunde Okafor')).toBeInTheDocument()
    expect(within(agents).queryByRole('link')).not.toBeInTheDocument()
  })

  it('lists verifications by reference, leading to their details', async () => {
    const [record] = summarizeSearch({ query: 'VR-', scope: 'ng' }).verifications
    signInAs('admin@jrb.gov.ng')
    renderApp(`/search?q=${record!.reference}`)
    const list = await screen.findByRole('list', { name: 'Verifications' })
    const link = within(list).getByRole('link', { name: new RegExp(record!.reference) })
    expect(link.getAttribute('href')).toContain(`ref=${record!.reference}`)
    expect(link).toHaveTextContent(record!.plate)
    expect(link).toHaveTextContent(record!.agent.name)
  })

  it('lists violations by reference, with their case status, leading to the case', async () => {
    const [violation] = summarizeSearch({ query: 'VIO-', scope: 'ng' }).violations
    signInAs('admin@jrb.gov.ng')
    renderApp(`/search?q=${violation!.id}`)
    const list = await screen.findByRole('list', { name: 'Violations' })
    const link = within(list).getByRole('link', { name: new RegExp(violation!.id) })
    expect(link.getAttribute('href')).toContain(`case=${violation!.id}`)
    expect(link).toHaveTextContent(`${violation!.plate} · ${violation!.category}`)
  })

  it('lists payment requests by reference, pending or received, leading to the notice', async () => {
    const [payment] = summarizeSearch({ query: 'DN-', scope: 'ng' }).payments
    signInAs('admin@jrb.gov.ng')
    renderApp(`/search?q=${payment!.id}`)
    const list = await screen.findByRole('list', { name: 'Payment requests' })
    const link = within(list).getByRole('link', { name: new RegExp(payment!.id) })
    expect(link.getAttribute('href')).toContain(`notice=${payment!.id}`)
    expect(link).toHaveTextContent(
      payment!.status === 'received' ? 'Payment received' : 'Payment pending',
    )
  })
})
