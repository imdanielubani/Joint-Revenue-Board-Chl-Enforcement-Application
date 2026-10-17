import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MOCK_USERS } from '@/mocks/mock-users'
import { renderApp } from '@/test/render-app'
import { saveSession, sessionExpiry } from './session'
import type { SessionPolicy } from './session-policy'

/**
 * Short times, so the tests run in seconds rather than 45 minutes; wide enough that a
 * busy machine loading the page cannot skip past the warning.
 */
const policy: SessionPolicy = {
  inactivityLimitMs: 4000,
  inactivityWarningMs: 3000,
  expiryWarningMs: 3000,
  checkEveryMs: 50,
}

/** Long enough to see a sign-out at 4s. */
const UNTIL_SIGNED_OUT = { timeout: 8000 }

function signIn(expiresAt: string = sessionExpiry()) {
  saveSession({
    session: { accessToken: 'access', refreshToken: 'refresh', user: MOCK_USERS[0]!, expiresAt },
    remember: false,
  })
}

describe('inactivity', { timeout: 20_000 }, () => {
  it('asks "Are you still there?" before signing out', async () => {
    signIn()
    renderApp('/overview', { sessionPolicy: policy })

    const status = await screen.findByRole('status')
    expect(await screen.findByText('Are you still there?')).toBeInTheDocument()
    expect(status).toHaveTextContent('You’ll be signed out in 1 minute because of inactivity.')
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('"Stay signed in" keeps the session', async () => {
    signIn()
    const { router } = renderApp('/overview', { sessionPolicy: policy })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Stay signed in' }))

    expect(screen.queryByText('Are you still there?')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })

  it('any activity removes the warning', async () => {
    signIn()
    renderApp('/overview', { sessionPolicy: policy })

    await screen.findByText('Are you still there?')
    fireEvent.keyDown(window, { key: 'a' })

    await expect.poll(() => screen.queryByText('Are you still there?')).toBeNull()
  })

  it('signs out after the limit and says why on the sign-in page', async () => {
    signIn()
    const { router } = renderApp('/overview', { sessionPolicy: policy })

    expect(await screen.findByText('Session expired', {}, UNTIL_SIGNED_OUT)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(screen.getByRole('status')).toHaveTextContent(
      'You were signed out after a period of inactivity. Please sign in again to continue.',
    )
    // The warning does not linger over the sign-in page.
    expect(screen.queryByText('Are you still there?')).not.toBeInTheDocument()
    expect(sessionStorage.length + localStorage.length).toBe(0)
  })

  it('counts activity in another tab', async () => {
    signIn()
    const { router } = renderApp('/overview', { sessionPolicy: policy })
    await screen.findByRole('heading', { name: 'Overview' })

    // Another tab records activity every 200ms for 5s, longer than the 4s limit.
    for (let i = 0; i < 25; i += 1) {
      localStorage.setItem('chl-dashboard.last-activity', String(Date.now()))
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    expect(router.state.location.pathname).toBe('/overview')
  })
})

describe('session expiring', { timeout: 20_000 }, () => {
  it('warns before the 24-hour end, then says the session expired', async () => {
    signIn(new Date(Date.now() + 4000).toISOString())
    const { router } = renderApp('/overview', {
      sessionPolicy: { ...policy, inactivityLimitMs: 60_000 },
    })

    expect(await screen.findByText('Session expiring')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your session ends in 1 minute. Sign in again afterwards to continue.',
    )
    // It cannot be extended, so it offers no action.
    expect(screen.queryByRole('button', { name: 'Stay signed in' })).not.toBeInTheDocument()

    expect(await screen.findByText('Session expired', {}, UNTIL_SIGNED_OUT)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(screen.queryByText('Session expiring')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your session has ended. Please sign in again to continue.',
    )
  })
})
