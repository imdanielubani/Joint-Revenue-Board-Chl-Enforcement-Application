import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY } from '@/features/auth/session'
import { mockAuthApi } from '@/mocks/mock-auth-api'
import { ApiError } from '@/shared/api/api-error'
import { MOCK_PASSWORD } from '@/mocks/mock-users'
import { renderApp, signInAs } from '@/test/render-app'

describe('signing in', () => {
  it('sends a signed-out visitor to the sign-in page, then back where they were going', async () => {
    const { router } = renderApp('/violations')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('heading', { name: 'Violations & cases' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/violations')
  })

  it('shows the "Sign-in error" notification for wrong details', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('Sign-in error')
    expect(toast).toHaveTextContent('We couldn’t sign you in. Check your details and try again.')
    expect(within(toast).getByRole('link', { name: 'Get sign-in help' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
    // The password is cleared; the email stays.
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Email Address')).toHaveValue('admin@jrb.gov.ng')
  })

  it('says what went wrong when the server cannot be reached, keeping the password', async () => {
    renderApp('/sign-in', {
      authApi: {
        ...mockAuthApi,
        signIn: () =>
          Promise.reject(new ApiError(0, 'network_error', 'The server could not be reached.')),
      },
    })
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('Sign-in error')
    expect(toast).toHaveTextContent('The server could not be reached.')
    expect(toast).not.toHaveTextContent('Check your details')
    expect(screen.getByLabelText('Password')).toHaveValue(MOCK_PASSWORD)
  })

  it('goes to sign-in help from the "Sign-in error" notification', async () => {
    const { router } = renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    await user.click(await screen.findByRole('link', { name: 'Get sign-in help' }))

    expect(await screen.findByRole('heading', { name: 'Get Sign-in help' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forgot-password')
    expect(screen.queryByText('Sign-in error')).not.toBeInTheDocument()
  })

  it('confirms a successful sign-in with the "Login successful" notification on the dashboard', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Login successful')).toBeInTheDocument()
    expect(
      screen.getByText('Welcome back. Your monitoring workspace is ready.'),
    ).toBeInTheDocument()
  })

  it('clears the "Logged out successfully" notification on signing back in', async () => {
    // Start already signed in, so the only notification is the one signing out shows.
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview')
    const user = userEvent.setup()

    await user.click(
      within(await screen.findByRole('complementary', { name: 'Sidebar' })).getByRole('button', {
        name: 'Log out',
      }),
    )
    expect(await screen.findByText('Logged out successfully')).toBeInTheDocument()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Login successful')).toBeInTheDocument()
    expect(screen.queryByText('Logged out successfully')).not.toBeInTheDocument()
  })

  it('clears the "Sign-in error" notification once a later attempt succeeds', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    await screen.findByText('Sign-in error')

    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Sign-in error')).not.toBeInTheDocument()
  })

  it('shows the "Account deactivated" notification for a deactivated account', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()
    const submit = async () => {
      await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
    }

    await user.type(await screen.findByLabelText('Email Address'), 'deactivated@jrb.gov.ng')
    await submit()

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('Account deactivated')
    expect(toast).toHaveTextContent(
      'Your account is deactivated. Your CHL administrator can help you restore access.',
    )
    // The password is cleared; the email stays.
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Email Address')).toHaveValue('deactivated@jrb.gov.ng')

    // Trying again replaces the notification rather than stacking another.
    await submit()
    await screen.findByRole('alert')
    expect(screen.getAllByText('Account deactivated')).toHaveLength(1)
  })

  it('goes to CHL support from the "Account deactivated" notification', async () => {
    const { router } = renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'deactivated@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    await user.click(await screen.findByRole('link', { name: 'Contact CHL support' }))

    expect(await screen.findByRole('heading', { name: 'How can we help?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/support')
    expect(screen.queryByText('Account deactivated')).not.toBeInTheDocument()
  })

  it('does not reveal a deactivated account to a wrong password', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'deactivated@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in error')
    expect(screen.queryByText('Account deactivated')).not.toBeInTheDocument()
  })

  it('checks the fields before calling the backend', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Sign In' }))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
  })

  it('shows and hides the password', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()
    const password = await screen.findByLabelText('Password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })
  it('keeps the session for this tab only, unless "Keep me signed in" is ticked', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await screen.findByRole('heading', { level: 1, name: 'Operational overview' })
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('keeps the session across browser restarts when "Keep me signed in" is ticked', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('checkbox', { name: 'Keep me signed in' }))
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await screen.findByRole('heading', { level: 1, name: 'Operational overview' })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('opens sign-in help from "Forgotten Password?"', async () => {
    const { router } = renderApp('/sign-in')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Forgotten Password?' }))

    expect(await screen.findByRole('heading', { name: 'Get Sign-in help' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forgot-password')
  })

  it('opens sign-in help from "Need help signing in?"', async () => {
    const { router } = renderApp('/sign-in')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Need help signing in?' }))

    expect(await screen.findByRole('heading', { name: 'Get Sign-in help' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forgot-password')
  })
})

describe('sign-in help', () => {
  it('explains that passwords are reset through CHL', async () => {
    renderApp('/forgot-password')

    expect(
      await screen.findByText(/Password resets are handled through your existing CHL account/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('goes back to sign-in', async () => {
    const { router } = renderApp('/forgot-password')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Back to sign in' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('opens CHL support', async () => {
    const { router } = renderApp('/forgot-password')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Contact CHL Support' }))

    expect(await screen.findByRole('heading', { name: 'How can we help?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/support')
  })

  it('shows a short note under "Need help signing in?"', async () => {
    renderApp('/forgot-password')
    const user = userEvent.setup()
    const help = await screen.findByRole('button', { name: 'Need help signing in?' })

    expect(help).toHaveAttribute('aria-expanded', 'false')
    await user.click(help)
    expect(help).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/contact your CHL administrator/)).toBeInTheDocument()
  })
})

describe('signed in', () => {
  it('opens the first module the user may see', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })

  it('lists only the modules the user may open', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/overview')

    const menu = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(menu).getByRole('link', { name: /^Violations & cases/ })).toBeInTheDocument()
    expect(within(menu).queryByRole('link', { name: 'History & audit' })).not.toBeInTheDocument()
  })

  it('refuses a module the user may not open', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/history')

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('signs out', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/overview')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(localStorage.length + sessionStorage.length).toBe(0)

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Logged out successfully')
    expect(toast).toHaveTextContent(
      'You have logged out of this workspace. Sign in again when you’re ready.',
    )
  })

  it('confirms the sign-out at once, without waiting for the backend', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/overview', {
      authApi: { ...mockAuthApi, signOut: () => new Promise<void>(() => {}) },
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(await screen.findByText('Logged out successfully')).toBeInTheDocument()
    // The sign-in page loads on first use, so it may arrive just after the notification.
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('keeps a signed-in user off the sign-in page', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/sign-in')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Operational overview' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })
})
