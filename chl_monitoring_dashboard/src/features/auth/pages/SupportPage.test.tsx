import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockSupportApi } from '@/mocks/mock-support-api'
import { ApiError } from '@/shared/api/api-error'
import { renderApp } from '@/test/render-app'

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Full name'), 'Adaeze Okafor')
  await user.type(screen.getByLabelText('CHL email address'), 'adaeze@jrb.gov.ng')
  await user.selectOptions(screen.getByLabelText('Issue type'), 'Account locked')
  await user.type(screen.getByLabelText('Message'), 'I cannot sign in since this morning.')
}

describe('CHL support', () => {
  it('checks every field before sending', async () => {
    const send = vi.spyOn(mockSupportApi, 'sendRequest')
    renderApp('/support')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Submit' }))

    expect(screen.getByText('Enter your full name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Choose what you need help with.')).toBeInTheDocument()
    expect(screen.getByText('Describe what happened.')).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true')
    expect(send).not.toHaveBeenCalled()
  })

  it('offers the issue types, with nothing chosen at first', async () => {
    renderApp('/support')
    const select = await screen.findByLabelText('Issue type')

    expect(select).toHaveValue('')
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'What do you need help with?',
      'Can’t sign in',
      'Account locked',
      'Wrong access',
      'Something else',
    ])
    expect(
      within(select).getByRole('option', { name: 'What do you need help with?' }),
    ).toBeDisabled()
  })

  it('counts the message characters', async () => {
    renderApp('/support')
    const user = userEvent.setup()

    expect(await screen.findByText('0/2000')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Message'), 'Hello')
    expect(screen.getByText('5/2000')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toHaveAttribute('maxLength', '2000')
  })

  it('sends the request, confirms with a notification and clears the form', async () => {
    const send = vi.spyOn(mockSupportApi, 'sendRequest')
    renderApp('/support')
    const user = userEvent.setup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    const toast = await screen.findByText('Email sent')
    expect(send).toHaveBeenCalledWith({
      fullName: 'Adaeze Okafor',
      email: 'adaeze@jrb.gov.ng',
      issueType: 'account_locked',
      message: 'I cannot sign in since this morning.',
    })
    const region = within(screen.getByRole('status'))
    expect(region.getByText('Your message has been sent to CHL support.')).toBeInTheDocument()
    // Sample data: the notification must not claim a real email went out.
    expect(region.getByText('Success preview only — no email has been sent.')).toBeInTheDocument()
    expect(toast).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('')
    expect(screen.getByLabelText('Issue type')).toHaveValue('')
    expect(screen.getByLabelText('Message')).toHaveValue('')
    expect(screen.getByText('0/2000')).toBeInTheDocument()
  })

  it('dismisses the notification', async () => {
    renderApp('/support')
    const user = userEvent.setup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await screen.findByText('Email sent')
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }))

    expect(screen.queryByText('Email sent')).not.toBeInTheDocument()
  })

  it('says when the message could not be sent, and keeps what was typed', async () => {
    vi.spyOn(mockSupportApi, 'sendRequest').mockRejectedValue(
      new ApiError(0, 'network_error', 'The server could not be reached.'),
    )
    renderApp('/support')
    const user = userEvent.setup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not be reached.')
    expect(screen.queryByText('Email sent')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('Adaeze Okafor')
  })

  it('goes back to sign-in', async () => {
    const { router } = renderApp('/support')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Back to sign in' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })
})
