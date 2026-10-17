import { beforeEach, describe, expect, it } from 'vitest'
import type { Session } from './auth.schemas'
import {
  DEFAULT_SESSION_POLICY,
  LAST_ACTIVITY_STORAGE_KEY,
  minutesLeft,
  recordActivity,
  sessionState,
  storedActivity,
} from './session-policy'

const MINUTE = 60_000
const signedInAt = Date.parse('2026-10-17T08:00:00Z')
const session = {
  expiresAt: new Date(signedInAt + 24 * 60 * MINUTE).toISOString(),
} as Session

beforeEach(() => localStorage.clear())

describe('session policy', () => {
  it('signs out after 45 minutes without activity, warning 2 minutes before', () => {
    expect(DEFAULT_SESSION_POLICY.inactivityLimitMs).toBe(45 * MINUTE)
    const active = signedInAt + MINUTE

    expect(sessionState(session, active, active + 42 * MINUTE)).toEqual({ kind: 'active' })
    expect(sessionState(session, active, active + 43 * MINUTE)).toEqual({
      kind: 'idle-warning',
      signsOutAt: active + 45 * MINUTE,
    })
    expect(sessionState(session, active, active + 45 * MINUTE)).toEqual({ kind: 'inactive' })
  })

  it('warns 5 minutes before the 24-hour end, which activity cannot put off', () => {
    const endsAt = Date.parse(session.expiresAt)

    expect(sessionState(session, endsAt - 6 * MINUTE, endsAt - 6 * MINUTE)).toEqual({
      kind: 'active',
    })
    expect(sessionState(session, endsAt - 5 * MINUTE, endsAt - 5 * MINUTE)).toEqual({
      kind: 'expiry-warning',
      endsAt,
    })
    expect(sessionState(session, endsAt, endsAt)).toEqual({ kind: 'expired' })
  })

  it('treats the fixed end as expiry even when the user was also idle', () => {
    const endsAt = Date.parse(session.expiresAt)
    expect(sessionState(session, endsAt - 60 * MINUTE, endsAt)).toEqual({ kind: 'expired' })
  })

  it('shares the last activity between tabs', () => {
    expect(storedActivity()).toBeNull()
    recordActivity(5000)
    expect(localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY)).toBe('5000')
    expect(storedActivity()).toBe(5000)
  })

  it('ignores an unreadable stored value', () => {
    localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, 'not a number')
    expect(storedActivity()).toBeNull()
  })

  it('says how many minutes are left, never 0', () => {
    expect(minutesLeft(5 * MINUTE, 0)).toBe('5 minutes')
    expect(minutesLeft(4 * MINUTE + 1, 0)).toBe('5 minutes')
    expect(minutesLeft(30_000, 0)).toBe('1 minute')
    expect(minutesLeft(-1, 0)).toBe('1 minute')
  })
})
