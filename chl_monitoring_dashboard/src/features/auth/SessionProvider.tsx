import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setAuthHandlers } from '@/shared/api/auth-bridge'
import { authApi as defaultAuthApi, type AuthApi } from './auth.api'
import {
  clearSession,
  loadSession,
  saveSession,
  SESSION_STORAGE_KEY,
  type StoredSession,
} from './session'
import {
  SessionContext,
  type SessionContextValue,
  type SignInOptions,
  type SignOutReason,
} from './session-context'

interface SessionProviderProps {
  children: ReactNode
  api?: AuthApi
}

/**
 * Holds the signed-in session: keeps it across reloads, renews the access
 * token when the backend asks, and signs out when the 24 hours end.
 */
export function SessionProvider({ children, api = defaultAuthApi }: SessionProviderProps) {
  const queryClient = useQueryClient()
  const [stored, setStored] = useState<StoredSession | null>(() => loadSession())
  const [endReason, setEndReason] = useState<SignOutReason | null>(null)
  const storedRef = useRef(stored)
  const refreshing = useRef<Promise<string | null> | null>(null)
  const session = stored?.session ?? null

  const update = useCallback((next: StoredSession | null) => {
    storedRef.current = next
    if (next) saveSession(next)
    else clearSession()
    setStored(next)
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
    async ({ remember, ...credentials }: SignInOptions) => {
      const next = await api.signIn(credentials)
      setEndReason(null)
      update({ session: next, remember })
    },
    [api, update],
  )

  const signOut = useCallback(async () => {
    const current = storedRef.current?.session
    end('signed_out')
    // Best effort: the session is already gone on this side.
    if (current) await api.signOut(current.refreshToken).catch(() => undefined)
  }, [api, end])

  // The HTTP client reads the token and asks for renewals through this bridge.
  useEffect(() => {
    setAuthHandlers({
      getAccessToken: () => storedRef.current?.session.accessToken ?? null,
      refreshAccessToken: () => {
        refreshing.current ??= (async () => {
          const current = storedRef.current
          if (!current) return null
          try {
            const tokens = await api.refresh(current.session.refreshToken)
            update({ ...current, session: { ...current.session, ...tokens } })
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
      storedRef.current = next
      setStored(next)
      if (!next) queryClient.clear()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  const clearEndReason = useCallback(() => setEndReason(null), [])

  const value = useMemo<SessionContextValue>(
    () => ({ session, user: session?.user ?? null, endReason, clearEndReason, signIn, signOut }),
    [session, endReason, clearEndReason, signIn, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
