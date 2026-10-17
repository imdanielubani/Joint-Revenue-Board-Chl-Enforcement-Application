import { createContext, useContext } from 'react'
import type { Session, SignInInput, User } from './auth.schemas'
import type { SessionState } from './session-policy'

/** Why the last session ended: signed out by the user, its 24 hours ran out, or inactivity. */
export type SignOutReason = 'signed_out' | 'expired' | 'inactive'

/** A session that will end soon: from inactivity, or at its fixed 24-hour end. */
export type SessionWarning = Extract<SessionState, { kind: 'idle-warning' | 'expiry-warning' }>

export interface SignInOptions extends SignInInput {
  /** "Keep me signed in": keep the session after the browser is closed (still 24 hours at most). */
  remember: boolean
}

export interface SessionContextValue {
  session: Session | null
  user: User | null
  /** Why the last session ended, so the sign-in page can say so. */
  endReason: SignOutReason | null
  /** Marks the end reason as shown, so it is said once rather than on every visit. */
  clearEndReason(): void
  /** Set while the session is about to end; null otherwise. */
  warning: SessionWarning | null
  /** Counts as activity: "Stay signed in" on the inactivity warning. */
  stayActive(): void
  signIn(options: SignInOptions): Promise<void>
  signOut(): Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>.')
  return value
}

/** The signed-in user. Only for screens behind <RequireAuth>. */
export function useCurrentUser(): User {
  const { user } = useSession()
  if (!user) throw new Error('useCurrentUser needs a signed-in user.')
  return user
}
