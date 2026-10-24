import { describe, expect, it } from 'vitest'
import { TEST_START } from './setup'

describe('the test clock', () => {
  it('starts at midday in Lagos, far from midnight', () => {
    const elapsed = Date.now() - TEST_START
    expect(elapsed).toBeGreaterThanOrEqual(0)
    expect(elapsed).toBeLessThan(60_000)
    expect(new Date().toISOString().slice(0, 13)).toBe('2026-10-24T11')
  })

  it('keeps real time, so timers and the clock agree', async () => {
    const before = Date.now()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(Date.now() - before).toBeGreaterThanOrEqual(45)
  })

  it('keeps a date given explicitly', () => {
    expect(new Date('2026-01-02T03:04:05Z').toISOString()).toBe('2026-01-02T03:04:05.000Z')
    expect(new Date(0).getTime()).toBe(0)
    expect(new Date() instanceof Date).toBe(true)
  })
})
