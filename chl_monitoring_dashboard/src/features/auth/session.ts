import { storage, tabStorage } from '@/shared/lib/storage'
import { sessionSchema, type Session } from './auth.schemas'

/** A dashboard session lasts 24 hours from sign-in, like the mobile app's. */
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export const SESSION_STORAGE_KEY = 'chl-dashboard.session'

export interface StoredSession {
  session: Session
  /**
   * "Keep me signed in": true keeps the session when the browser is closed
   * and reopened; false ends it with the tab. Either way it ends at 24 hours.
   */
  remember: boolean
}

export function sessionExpiry(signedInAt: number = Date.now()): string {
  return new Date(signedInAt + SESSION_DURATION_MS).toISOString()
}

export function isSessionExpired(session: Session, now: number = Date.now()): boolean {
  return Date.parse(session.expiresAt) <= now
}

/** The saved session, or null when there is none, it is unreadable or it has expired. */
export function loadSession(now: number = Date.now()): StoredSession | null {
  for (const [area, remember] of [
    [storage, true],
    [tabStorage, false],
  ] as const) {
    const raw = area.get(SESSION_STORAGE_KEY)
    if (!raw) continue
    try {
      const session = sessionSchema.parse(JSON.parse(raw))
      if (!isSessionExpired(session, now)) return { session, remember }
    } catch {
      // Unreadable: treat as signed out.
    }
    area.remove(SESSION_STORAGE_KEY)
  }
  return null
}

export function saveSession({ session, remember }: StoredSession): void {
  const [keep, drop] = remember ? [storage, tabStorage] : [tabStorage, storage]
  keep.set(SESSION_STORAGE_KEY, JSON.stringify(session))
  drop.remove(SESSION_STORAGE_KEY)
}

export function clearSession(): void {
  storage.remove(SESSION_STORAGE_KEY)
  tabStorage.remove(SESSION_STORAGE_KEY)
}
