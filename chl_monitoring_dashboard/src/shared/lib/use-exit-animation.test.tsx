import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EXIT_MS } from './motion'
import { useExitAnimation } from './use-exit-animation'

function Box() {
  const ref = useRef<HTMLDivElement>(null)
  useExitAnimation(ref, 'leaving')
  return (
    <div ref={ref} id="box" className="box">
      <button type="button" id="inside">
        Inside
      </button>
    </div>
  )
}

const allowMotion = (allowed: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: allowed, media: query }),
  })

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  vi.useRealTimers()
})

describe('useExitAnimation', () => {
  it('leaves a still, unreachable copy that animates out, then goes', () => {
    vi.useFakeTimers()
    allowMotion(true)
    const { rerender, container } = render(<Box />)
    rerender(<></>)

    const copy = container.querySelector('.box')
    expect(copy).not.toBeNull()
    expect(copy).toHaveClass('leaving')
    expect(copy).toHaveAttribute('aria-hidden', 'true')
    expect(copy).toHaveAttribute('inert')
    expect(copy!.querySelector('[id]')).toBeNull()
    expect(document.getElementById('box')).toBeNull()

    vi.advanceTimersByTime(EXIT_MS + 60)
    expect(container.querySelector('.box')).toBeNull()
  })

  it('goes at once where motion is reduced or the setting is unknown', () => {
    allowMotion(false)
    const first = render(<Box />)
    first.rerender(<></>)
    expect(first.container.querySelector('.box')).toBeNull()

    Reflect.deleteProperty(window, 'matchMedia')
    const second = render(<Box />)
    second.rerender(<></>)
    expect(second.container.querySelector('.box')).toBeNull()
  })
})
