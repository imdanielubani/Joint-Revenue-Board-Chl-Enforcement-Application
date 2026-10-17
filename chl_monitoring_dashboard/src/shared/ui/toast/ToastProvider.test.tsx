import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToast, type ToastInput } from './toast-context'
import { TOAST_DURATION_MS, ToastProvider } from './ToastProvider'

function Trigger({ label, toast }: { label: string; toast: ToastInput }) {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast(toast)}>
      {label}
    </button>
  )
}

function renderToasts(...triggers: { label: string; toast: ToastInput }[]) {
  render(
    <MemoryRouter>
      <ToastProvider>
        {triggers.map((trigger) => (
          <Trigger key={trigger.label} {...trigger} />
        ))}
      </ToastProvider>
    </MemoryRouter>,
  )
}

const click = (name: string) => act(() => screen.getByRole('button', { name }).click())

afterEach(() => vi.useRealTimers())

describe('ToastProvider', () => {
  it('dismisses each success notification on its own timer', () => {
    vi.useFakeTimers()
    renderToasts(
      { label: 'Show first', toast: { title: 'First' } },
      { label: 'Show second', toast: { title: 'Second' } },
    )

    click('Show first')
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1000))
    // A second notification must not restart the first one's timer.
    click('Show second')
    act(() => vi.advanceTimersByTime(1000))

    expect(screen.queryByText('First')).not.toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
  })

  it('announces success politely', () => {
    renderToasts({ label: 'Show', toast: { title: 'Saved', lines: ['Line one'] } })

    click('Show')

    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('Saved')
    expect(region).toHaveTextContent('Line one')
  })

  it('announces errors at once and keeps them until dismissed', () => {
    vi.useFakeTimers()
    renderToasts({ label: 'Show', toast: { variant: 'error', title: 'Account deactivated' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    click('Show')
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 10))

    expect(screen.getByRole('alert')).toHaveTextContent('Account deactivated')
    click('Dismiss notification')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('replaces a notification with the same key instead of stacking', () => {
    renderToasts({ label: 'Show', toast: { variant: 'error', title: 'Once', key: 'same' } })

    click('Show')
    click('Show')

    expect(screen.getAllByText('Once')).toHaveLength(1)
  })

  it('shows an action link that also dismisses the notification', () => {
    renderToasts({
      label: 'Show',
      toast: { variant: 'error', title: 'Oops', action: { label: 'Get help', to: '/support' } },
    })

    click('Show')
    const link = screen.getByRole('link', { name: 'Get help' })
    expect(link).toHaveAttribute('href', '/support')

    act(() => link.click())
    expect(screen.queryByText('Oops')).not.toBeInTheDocument()
  })

  it('keeps warnings until dismissed and announces them politely', () => {
    vi.useFakeTimers()
    renderToasts({ label: 'Show', toast: { variant: 'warning', title: 'Session expired' } })

    click('Show')
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 10))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Session expired')
  })

  it('runs an on-page action as a button, then dismisses the notification', () => {
    const onSelect = vi.fn()
    renderToasts({
      label: 'Show',
      toast: { variant: 'warning', title: 'Later', action: { label: 'Do it', onSelect } },
    })

    click('Show')
    expect(screen.queryByRole('link', { name: 'Do it' })).not.toBeInTheDocument()
    click('Do it')

    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.queryByText('Later')).not.toBeInTheDocument()
  })
})
