import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'

describe('repeat vehicle alerts page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/repeat-alerts')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Repeat vehicle alerts' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Repeat vehicle alerts' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('Read-only: no case is closed or changed here.')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
  })

  it('reports on the area the user picks, within their own', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/repeat-alerts?scope=ng')
    const hero = await screen.findByRole('region', { name: 'Repeat vehicle alerts' })
    // A Principal Officer in Ikeja cannot widen the view to the whole country.
    expect(hero).toHaveTextContent('qualifying times in Ikeja')
  })
})
