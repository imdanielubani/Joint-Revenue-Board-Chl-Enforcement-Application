import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY } from '@/features/auth/session'
import { mockAuthApi } from '@/mocks/mock-auth-api'
import { MOCK_PASSWORD } from '@/mocks/mock-users'
import { renderApp, signInAs } from '@/test/render-app'

describe('signing in', () => {
  it('sends a signed-out visitor to the sign-in page, then back where they were going', async () => {
    const { router } = renderApp('/violations')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('heading', { name: 'Violations & Cases' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/violations')
  })

  it('says when the email or password is wrong', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email Address'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password is incorrect.',
    )
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password is incorrect.',
    )
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

    await screen.findByRole('heading', { name: 'Overview' })
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

    await screen.findByRole('heading', { name: 'Overview' })
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

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })

  it('lists only the modules the user may open', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/overview')

    const menu = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(menu).getByRole('link', { name: 'Violations' })).toBeInTheDocument()
    expect(within(menu).queryByRole('link', { name: 'History & Audit' })).not.toBeInTheDocument()
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

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

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

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('Logged out successfully')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('keeps a signed-in user off the sign-in page', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/sign-in')

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })
})
