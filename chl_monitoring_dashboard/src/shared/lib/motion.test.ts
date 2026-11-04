import { afterEach, describe, expect, it, vi } from 'vitest'
import { motionAllowed } from './motion'

const media = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({ matches, media: query }))

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('motionAllowed', () => {
  it('allows motion when the system has no preference', () => {
    Object.defineProperty(window, 'matchMedia', { value: media(true), configurable: true })
    expect(motionAllowed()).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: no-preference)')
  })

  it('does not when the user asked for reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', { value: media(false), configurable: true })
    expect(motionAllowed()).toBe(false)
  })

  it('does not where the system cannot say', () => {
    expect(motionAllowed()).toBe(false)
  })
})
