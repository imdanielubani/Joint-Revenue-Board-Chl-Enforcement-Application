import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { syncStateOf } from '@/features/verifications/verifications-display'
import { summarizeAuditTrail } from '@/mocks/mock-audit-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}

/** What the page must show for an area over the last 14 days, the default period. */
const expected = (scope = 'ng') =>
  summarizeAuditTrail({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).entries

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

  it('counts the attempts, the unsuccessful ones, the violations issued and the pending uploads', async () => {
    const entries = expected()
    expect(entries.length).toBeGreaterThan(0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/audit')
    expect(await figure('Verification attempts')).toHaveTextContent(
      `${entries.length}Successful and unsuccessful · ${new Set(entries.map((e) => e.agent.id)).size} agents`,
    )
    expect(await figure('Unsuccessful attempts')).toHaveTextContent(
      String(entries.filter((entry) => entry.attempt === 'unsuccessful').length),
    )
    expect(await figure('Violations issued')).toHaveTextContent(
      String(entries.filter((entry) => entry.actionTaken === 'violation_issued').length),
    )
    expect(await figure('Upload pending')).toHaveTextContent(
      String(entries.filter((entry) => syncStateOf(entry) === 'upload_pending').length),
    )
  })
})
