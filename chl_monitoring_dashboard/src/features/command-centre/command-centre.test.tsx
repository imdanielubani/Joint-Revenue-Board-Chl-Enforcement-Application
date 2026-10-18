import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
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
