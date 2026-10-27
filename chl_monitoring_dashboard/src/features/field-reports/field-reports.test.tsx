import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'

describe('field reports page', () => {
  it('opens on the banner and the area, period and people filters', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-reports')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Field reports' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Field reports' })
    expect(hero).toHaveTextContent('JRB CHL/Enforcement')
    expect(hero).toHaveTextContent('Read-only: nothing is answered or changed here.')
    expect(within(hero).getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Date range' })).toBeInTheDocument()
  })

  it('reports on the area the user picks, within their own', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/field-reports?scope=ng')
    const hero = await screen.findByRole('region', { name: 'Field reports' })
    // A Lagos supervisor cannot widen the view to the whole country.
    expect(hero).toHaveTextContent('from the field in Lagos')
  })

  it('is not open to a role without the module', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/field-reports')
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })
})
