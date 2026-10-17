import { beforeEach, describe, expect, it } from 'vitest'
import type { Session } from './auth.schemas'
import {
  SESSION_DURATION_MS,
  SESSION_STORAGE_KEY,
  isSessionExpired,
  loadSession,
  saveSession,
  sessionExpiry,
} from './session'

const signedInAt = Date.parse('2026-10-17T08:00:00Z')

const session: Session = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: sessionExpiry(signedInAt),
  user: {
    id: 'u1',
    name: 'Ada Admin',
    email: 'admin@jrb.gov.ng',
    role: 'administrator',
    organization: 'JRB',
    scopes: [{ level: 'national', id: 'ng', name: 'Nigeria' }],
    modules: ['overview'],
  },
}

beforeEach(() => localStorage.clear())

describe('session', () => {
  it('lasts 24 hours from sign-in', () => {
    expect(SESSION_DURATION_MS).toBe(86_400_000)
    expect(isSessionExpired(session, signedInAt + SESSION_DURATION_MS - 1)).toBe(false)
    expect(isSessionExpired(session, signedInAt + SESSION_DURATION_MS)).toBe(true)
  })

  it('is remembered until it expires', () => {
    saveSession(session)
    expect(loadSession(signedInAt + 60_000)).toEqual(session)
    expect(loadSession(signedInAt + SESSION_DURATION_MS)).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('forgets an unreadable session', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{"accessToken": 1}')
    expect(loadSession(signedInAt)).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})
