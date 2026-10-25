import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Pages load on first use; on a busy machine the first one in a worker can take several
// seconds. This stays under the test timeout (vite.config.ts), so a real failure still fails.
configure({ asyncUtilTimeout: 10_000 })

// jsdom lays nothing out, so it has no scrolling; browsers all have this.
Element.prototype.scrollIntoView ??= () => {}

/**
 * Each test file runs as if it started at midday in Lagos. The sample data is
 * built from the current date, so a run that crossed midnight could see one
 * day in a test's expectations and the next in the page. The clock is moved by
 * a fixed amount, not stopped: it keeps real time, so timers, waits and
 * session expiry behave exactly as they do outside the tests.
 */
export const TEST_START = Date.parse('2026-10-24T11:00:00Z')

const RealDate = Date
const offset = TEST_START - RealDate.now()

class TestDate extends RealDate {
  constructor(...args: unknown[]) {
    // `new Date()` is now; a date given explicitly is kept as given.
    super(...((args.length === 0 ? [RealDate.now() + offset] : args) as [number]))
  }

  static override now() {
    return RealDate.now() + offset
  }
}

globalThis.Date = TestDate as DateConstructor

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
