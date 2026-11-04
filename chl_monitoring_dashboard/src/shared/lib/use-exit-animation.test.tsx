import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EXIT_MS } from './motion'
import { useExitRef } from './use-exit-animation'

/** A box that comes and goes while its owner stays, as a menu does. */
function Owner({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const exitRef = useExitRef('leaving', ref)
  return (
    <section>
      {open && (
        <div ref={exitRef} id="box" className="box">
          <button type="button" id="inside">
            Inside
          </button>
        </div>
      )}
    </section>
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

describe('useExitRef', () => {
  it('leaves a still, unreachable copy that animates out, then goes', () => {
    vi.useFakeTimers()
    allowMotion(true)
    const { rerender, container } = render(<Owner open />)
    rerender(<Owner open={false} />)

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
    const first = render(<Owner open />)
    first.rerender(<Owner open={false} />)
    expect(first.container.querySelector('.box')).toBeNull()

    Reflect.deleteProperty(window, 'matchMedia')
    const second = render(<Owner open />)
    second.rerender(<Owner open={false} />)
    expect(second.container.querySelector('.box')).toBeNull()
  })
})
