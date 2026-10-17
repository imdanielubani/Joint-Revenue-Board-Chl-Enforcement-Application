import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MOCK_PASSWORD, MOCK_USERS } from '@/mocks/mock-users'
import { renderApp } from '@/test/render-app'
import { saveSession } from './session'

/** Signs in as the admin with a session that ends `ms` from now. */
function signInExpiringIn(ms: number) {
  const user = MOCK_USERS[0]!
  saveSession({
    session: {
      accessToken: 'access',
      refreshToken: 'refresh',
      user,
      expiresAt: new Date(Date.now() + ms).toISOString(),
    },
    remember: false,
  })
}

describe('session expiry', { timeout: 20_000 }, () => {
  it('shows the "Session expired" notification over the sign-in page', async () => {
    signInExpiringIn(4000)
    const { router } = renderApp('/violations')

    expect(await screen.findByRole('heading', { name: 'Violations & cases' })).toBeInTheDocument()

    const toast = await screen.findByText('Session expired', {}, { timeout: 8000 })
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your session has ended. Please sign in again to continue.',
    )
    expect(toast).toBeInTheDocument()
  })

  it('"Sign in again" puts the cursor in the form, then returns to the page after signing in', async () => {
    signInExpiringIn(4000)
    const { router } = renderApp('/violations')
    const user = userEvent.setup()

    await screen.findByText('Session expired', {}, { timeout: 8000 })
    await user.click(screen.getByRole('button', { name: 'Sign in again' }))

    expect(screen.getByLabelText('Email Address')).toHaveFocus()
    expect(screen.queryByText('Session expired')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('heading', { name: 'Violations & cases' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/violations')
  })

  it('stays until dismissed, and says it only once', async () => {
    signInExpiringIn(4000)
    const { router } = renderApp('/overview')
    const user = userEvent.setup()

    const title = await screen.findByText('Session expired', {}, { timeout: 8000 })
    // The "Session expiring" warning from before the end must not linger over the sign-in page.
    await waitFor(() => expect(screen.queryByText('Session expiring')).not.toBeInTheDocument())
    const toast = title.closest('[class*="toast"]') as HTMLElement
    await user.click(within(toast).getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByText('Session expired')).not.toBeInTheDocument()

    // Leaving the sign-in page and coming back does not announce it again.
    await user.click(screen.getByRole('link', { name: 'Forgotten Password?' }))
    // Wait for the help page, so the sign-in heading found below is the new one.
    expect(await screen.findByRole('heading', { name: 'Get Sign-in help' })).toBeInTheDocument()
    await router.navigate('/sign-in')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByText('Session expired')).not.toBeInTheDocument()
  })

  it('is not shown when the user signs out themselves', async () => {
    signInExpiringIn(60_000)
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(await screen.findByText('Logged out successfully')).toBeInTheDocument()
    expect(screen.queryByText('Session expired')).not.toBeInTheDocument()
  })
})
