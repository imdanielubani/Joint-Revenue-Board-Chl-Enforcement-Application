import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './toast-context'
import { TOAST_DURATION_MS, ToastProvider } from './ToastProvider'

function Trigger({ title }: { title: string }) {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast({ title, lines: ['Line one'] })}>
      Show {title}
    </button>
  )
}

afterEach(() => vi.useRealTimers())

describe('ToastProvider', () => {
  it('dismisses each notification on its own timer', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger title="First" />
        <Trigger title="Second" />
      </ToastProvider>,
    )

    act(() => screen.getByRole('button', { name: 'Show First' }).click())
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1000))
    // A second notification must not restart the first one's timer.
    act(() => screen.getByRole('button', { name: 'Show Second' }).click())
    act(() => vi.advanceTimersByTime(1000))

    expect(screen.queryByText('First')).not.toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
  })

  it('announces notifications politely to screen readers', () => {
    render(
      <ToastProvider>
        <Trigger title="Saved" />
      </ToastProvider>,
    )

    act(() => screen.getByRole('button', { name: 'Show Saved' }).click())

    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('Saved')
    expect(region).toHaveTextContent('Line one')
  })
})
