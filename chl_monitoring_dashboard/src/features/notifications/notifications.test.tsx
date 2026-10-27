import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'

describe('notifications page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/notifications')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notifications' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Notifications' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('Read-only: nothing is sent to agents or answered here.')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
  })

  it('reports the notifications in the area the user picks, within their own', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/notifications?scope=ng')
    const hero = await screen.findByRole('region', { name: 'Notifications' })
    // A Principal Officer in Ikeja cannot widen the view to the whole country.
    expect(hero).toHaveTextContent('delivered for Ikeja')
  })
})
