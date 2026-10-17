import { storage } from '@/shared/lib/storage'
import { sessionSchema, type Session } from './auth.schemas'

/** A dashboard session lasts 24 hours from sign-in, like the mobile app's. */
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export const SESSION_STORAGE_KEY = 'chl-dashboard.session'

export function sessionExpiry(signedInAt: number = Date.now()): string {
  return new Date(signedInAt + SESSION_DURATION_MS).toISOString()
}

export function isSessionExpired(session: Session, now: number = Date.now()): boolean {
  return Date.parse(session.expiresAt) <= now
}

/** The remembered session, or null when there is none, it is unreadable or it has expired. */
export function loadSession(now: number = Date.now()): Session | null {
  const raw = storage.get(SESSION_STORAGE_KEY)
  if (!raw) return null
  try {
    const session = sessionSchema.parse(JSON.parse(raw))
    if (!isSessionExpired(session, now)) return session
  } catch {
    // Unreadable: treat as signed out.
  }
  clearSession()
  return null
}

export function saveSession(session: Session): void {
  storage.set(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  storage.remove(SESSION_STORAGE_KEY)
}
