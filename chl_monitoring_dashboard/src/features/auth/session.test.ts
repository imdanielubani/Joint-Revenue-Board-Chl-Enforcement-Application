import { beforeEach, describe, expect, it } from 'vitest'
import type { Session } from './auth.schemas'
import {
  SESSION_DURATION_MS,
  SESSION_STORAGE_KEY,
  clearSession,
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

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('session', () => {
  it('lasts 24 hours from sign-in', () => {
    expect(SESSION_DURATION_MS).toBe(86_400_000)
    expect(isSessionExpired(session, signedInAt + SESSION_DURATION_MS - 1)).toBe(false)
    expect(isSessionExpired(session, signedInAt + SESSION_DURATION_MS)).toBe(true)
  })

  it('"Keep me signed in" keeps it across browser restarts, until it expires', () => {
    saveSession({ session, remember: true })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(loadSession(signedInAt + 60_000)).toEqual({ session, remember: true })

    expect(loadSession(signedInAt + SESSION_DURATION_MS)).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('otherwise keeps it only for this tab', () => {
    saveSession({ session, remember: false })
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(loadSession(signedInAt + 60_000)).toEqual({ session, remember: false })
  })

  it('keeps one copy only when the choice changes', () => {
    saveSession({ session, remember: true })
    saveSession({ session, remember: false })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
  })

  it('forgets an unreadable session', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{"accessToken": 1}')
    expect(loadSession(signedInAt)).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('clears both copies on sign-out', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, 'x')
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'x')
    clearSession()
    expect(localStorage.length + sessionStorage.length).toBe(0)
  })
})
