import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MOCK_PASSWORD } from '@/mocks/mock-users'
import { renderApp, signInAs } from '@/test/render-app'

describe('signing in', () => {
  it('sends a signed-out visitor to the sign-in page, then back where they were going', async () => {
    const { router } = renderApp('/violations')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Violations & Cases' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/violations')
  })

  it('says when the email or password is wrong', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email'), 'admin@jrb.gov.ng')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password is incorrect.',
    )
  })

  it('checks the fields before calling the backend', async () => {
    renderApp('/sign-in')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Sign in' }))

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

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(localStorage.length).toBe(0)
  })

  it('keeps a signed-in user off the sign-in page', async () => {
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/sign-in')

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/overview')
  })
})
