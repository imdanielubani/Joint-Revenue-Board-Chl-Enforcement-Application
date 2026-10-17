import { createContext, useContext } from 'react'
import type { Session, SignInInput, User } from './auth.schemas'

export type SignOutReason = 'signed_out' | 'expired'

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
