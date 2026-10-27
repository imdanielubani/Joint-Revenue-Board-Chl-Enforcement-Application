import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'

describe('page not found', () => {
  it('says the page was not found, inside the dashboard, with the way home', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/no-such-page')
    const card = await screen.findByRole('region', { name: 'Page not found.' })
    expect(card).toHaveTextContent('404.')
    expect(within(card).getByText('not found.').tagName).toBe('MARK')
    expect(card).toHaveTextContent(
      'The address you followed does not lead to a page on the JRB CHL Monitoring Dashboard.',
    )
    // The top bar names the page, and the sidebar stays.
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Sidebar' })).toBeInTheDocument()
    // The illustration is decoration only.
    const art = card.querySelector('img')!
    expect(art).toHaveAttribute('alt', '')
    expect(art.getAttribute('src')).toContain('not-found/unplugged.webp')
  })

  it('goes back home', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/no-such-page')
    await userEvent.click(await screen.findByRole('link', { name: 'Go back home' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })

  it('asks a signed-out visitor to sign in first', async () => {
    const { router } = renderApp('/no-such-page')
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })
})
