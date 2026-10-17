import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setAuthHandlers } from '@/shared/api/auth-bridge'
import { authApi as defaultAuthApi, type AuthApi } from './auth.api'
import type { Session, SignInInput } from './auth.schemas'
import { clearSession, loadSession, saveSession, SESSION_STORAGE_KEY } from './session'
import { SessionContext, type SessionContextValue, type SignOutReason } from './session-context'

interface SessionProviderProps {
  children: ReactNode
  api?: AuthApi
}

/**
 * Holds the signed-in session: remembers it across reloads, renews the
 * access token when the backend asks, and signs out when the 24 hours end.
 */
export function SessionProvider({ children, api = defaultAuthApi }: SessionProviderProps) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [endReason, setEndReason] = useState<SignOutReason | null>(null)
  const sessionRef = useRef(session)
  const refreshing = useRef<Promise<string | null> | null>(null)

  const update = useCallback((next: Session | null) => {
    sessionRef.current = next
    if (next) saveSession(next)
    else clearSession()
    setSession(next)
  }, [])

  const end = useCallback(
    (reason: SignOutReason) => {
      update(null)
      setEndReason(reason)
      // Another user may sign in next: drop everything this one loaded.
      queryClient.clear()
    },
    [queryClient, update],
  )

  const signIn = useCallback(
    async (input: SignInInput) => {
      const next = await api.signIn(input)
      setEndReason(null)
      update(next)
    },
    [api, update],
  )

  const signOut = useCallback(async () => {
    const current = sessionRef.current
    end('signed_out')
    // Best effort: the session is already gone on this side.
    if (current) await api.signOut(current.refreshToken).catch(() => undefined)
  }, [api, end])

  // The HTTP client reads the token and asks for renewals through this bridge.
  useEffect(() => {
    setAuthHandlers({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      refreshAccessToken: () => {
        refreshing.current ??= (async () => {
          const current = sessionRef.current
          if (!current) return null
          try {
            const tokens = await api.refresh(current.refreshToken)
            update({ ...current, ...tokens })
            return tokens.accessToken
          } catch {
            end('expired')
            return null
          } finally {
            refreshing.current = null
          }
        })()
        return refreshing.current
      },
    })
    return () => setAuthHandlers(null)
  }, [api, end, update])

  // Sign out when the session's 24 hours are up.
  useEffect(() => {
    if (!session) return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    const timer = window.setTimeout(() => end('expired'), Math.max(remaining, 0))
    return () => window.clearTimeout(timer)
  }, [session, end])

  // Signing in or out in another tab applies here too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY) return
      const next = loadSession()
      sessionRef.current = next
      setSession(next)
      if (!next) queryClient.clear()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  const value = useMemo<SessionContextValue>(
    () => ({ session, user: session?.user ?? null, endReason, signIn, signOut }),
    [session, endReason, signIn, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
