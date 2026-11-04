import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COUNT_UP_MS, HeadlineFigures } from './HeadlineFigures'

const figures = (value: number) => [
  { label: 'Records received', value, icon: 'x.svg', note: 'All' },
]

const FAKED = [
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'performance',
  'setTimeout',
  'clearTimeout',
] as const

const allowMotion = () =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: true, media: query }),
  })

const itemOf = () => screen.getByText('Records received').closest('li')!

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  vi.useRealTimers()
})

describe('HeadlineFigures', () => {
  it('counts up when the figures first appear, telling screen readers the real value', () => {
    vi.useFakeTimers({ toFake: [...FAKED] })
    allowMotion()
    render(<HeadlineFigures items={figures(1200)} />)

    // Starting: the visible digits are below the figure; the real one is there for screen readers.
    const shown = itemOf().querySelector('[aria-hidden="true"]')
    expect(shown).not.toBeNull()
    expect(Number(shown!.textContent!.replace(/\D/g, ''))).toBeLessThan(1200)
    expect(itemOf()).toHaveTextContent('1,200')

    act(() => vi.advanceTimersByTime(COUNT_UP_MS + 50))
    expect(itemOf().querySelector('[aria-hidden="true"]')).toBeNull()
    expect(itemOf()).toHaveTextContent('Records received1,200')
  })

  it('does not count again when a figure changes later', () => {
    vi.useFakeTimers({ toFake: [...FAKED] })
    allowMotion()
    const { rerender } = render(<HeadlineFigures items={figures(1200)} />)
    act(() => vi.advanceTimersByTime(COUNT_UP_MS + 50))

    rerender(<HeadlineFigures items={figures(1300)} />)
    expect(itemOf().querySelector('[aria-hidden="true"]')).toBeNull()
    expect(itemOf()).toHaveTextContent('Records received1,300')
  })

  it('shows the figure at once where motion is reduced or the setting is unknown', () => {
    render(<HeadlineFigures items={figures(1200)} />)
    expect(itemOf().querySelector('[aria-hidden="true"]')).toBeNull()
    expect(itemOf()).toHaveTextContent('Records received1,200')
  })
})
