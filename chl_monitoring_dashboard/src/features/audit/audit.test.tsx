import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '@/test/render-app'

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
})
