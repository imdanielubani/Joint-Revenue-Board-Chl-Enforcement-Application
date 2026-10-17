import { createContext, useContext } from 'react'
import type { Session, SignInInput, User } from './auth.schemas'

export type SignOutReason = 'signed_out' | 'expired'

export interface SessionContextValue {
  session: Session | null
  user: User | null
  /** Why the last session ended, so the sign-in page can say so. */
  endReason: SignOutReason | null
  signIn(input: SignInInput): Promise<void>
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
