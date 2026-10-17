import { storage } from '@/shared/lib/storage'
import type { Session } from './auth.schemas'

const MINUTE = 60 * 1000

/** When a session ends, and when the user is warned first. */
export interface SessionPolicy {
  /** Signed out after this long without activity, in every tab. */
  inactivityLimitMs: number
  /** "Are you still there?" shows this long before the inactivity sign-out. */
  inactivityWarningMs: number
  /** "Session expiring" shows this long before the session's fixed end (24 hours from sign-in). */
  expiryWarningMs: number
  /** How often the session is checked. */
  checkEveryMs: number
}

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  inactivityLimitMs: 45 * MINUTE,
  inactivityWarningMs: 2 * MINUTE,
  expiryWarningMs: 5 * MINUTE,
  checkEveryMs: 1000,
}

/** The last activity, shared by every tab so working in one keeps the others signed in. */
export const LAST_ACTIVITY_STORAGE_KEY = 'chl-dashboard.last-activity'

export function recordActivity(now: number = Date.now()): void {
  storage.set(LAST_ACTIVITY_STORAGE_KEY, String(now))
}

/** The last activity recorded by any tab, or null when none is stored (or storage is blocked). */
export function storedActivity(): number | null {
  const stored = Number(storage.get(LAST_ACTIVITY_STORAGE_KEY))
  return Number.isFinite(stored) && stored > 0 ? stored : null
}

export function clearActivity(): void {
  storage.remove(LAST_ACTIVITY_STORAGE_KEY)
}

export type SessionState =
  | { kind: 'active' }
  /** The inactivity sign-out is near. */
  | { kind: 'idle-warning'; signsOutAt: number }
  /** The session's fixed end is near; it cannot be extended. */
  | { kind: 'expiry-warning'; endsAt: number }
  | { kind: 'expired' }
  | { kind: 'inactive' }

/**
 * Where the session stands at `now`. Ending wins over warning, and the fixed end
 * wins over inactivity, since it cannot be put off by being active.
 */
export function sessionState(
  session: Session,
  lastActiveAt: number,
  now: number,
  policy: SessionPolicy = DEFAULT_SESSION_POLICY,
): SessionState {
  const endsAt = Date.parse(session.expiresAt)
  const signsOutAt = lastActiveAt + policy.inactivityLimitMs

  if (now >= endsAt) return { kind: 'expired' }
  if (now >= signsOutAt) return { kind: 'inactive' }
  if (now >= endsAt - policy.expiryWarningMs) return { kind: 'expiry-warning', endsAt }
  if (now >= signsOutAt - policy.inactivityWarningMs) return { kind: 'idle-warning', signsOutAt }
  return { kind: 'active' }
}

/** "5 minutes", "1 minute": whole minutes left, rounded up so it never says 0. */
export function minutesLeft(until: number, now: number = Date.now()): string {
  const minutes = Math.max(1, Math.ceil((until - now) / MINUTE))
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}
