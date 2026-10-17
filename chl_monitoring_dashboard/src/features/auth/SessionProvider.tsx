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
  type SessionWarning,
  type SignInOptions,
  type SignOutReason,
} from './session-context'
import {
  clearActivity,
  DEFAULT_SESSION_POLICY,
  recordActivity,
  sessionState,
  storedActivity,
  type SessionPolicy,
} from './session-policy'

/** What counts as the user being active. Background data refreshes do not. */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']

/** Activity is shared with other tabs at most this often, so mouse movement stays cheap. */
const ACTIVITY_WRITE_EVERY_MS = 5000

interface SessionProviderProps {
  children: ReactNode
  api?: AuthApi
  /** Tests pass shorter times. */
  policy?: SessionPolicy
}

/**
 * Holds the signed-in session: keeps it across reloads, renews the access
 * token when the backend asks, and signs out after 45 minutes without
 * activity or when the 24 hours end, warning a few minutes before either.
 */
export function SessionProvider({
  children,
  api = defaultAuthApi,
  policy = DEFAULT_SESSION_POLICY,
}: SessionProviderProps) {
  const queryClient = useQueryClient()
  const [stored, setStored] = useState<StoredSession | null>(() => loadSession())
  const [endReason, setEndReason] = useState<SignOutReason | null>(null)
  const [warning, setWarning] = useState<SessionWarning | null>(null)
  const storedRef = useRef(stored)
  const refreshing = useRef<Promise<string | null> | null>(null)
  // This tab's last activity; set when the session starts being watched (see below).
  const lastActiveRef = useRef<number | null>(null)
  const lastWrittenRef = useRef(0)
  const session = stored?.session ?? null

  const update = useCallback((next: StoredSession | null) => {
    storedRef.current = next
    if (next) saveSession(next)
    else clearSession()
    setStored(next)
  }, [])

  /** Notes activity now; shares it with other tabs, at most every few seconds unless forced. */
  const markActive = useCallback((force = false) => {
    const now = Date.now()
    lastActiveRef.current = now
    if (force || now - lastWrittenRef.current >= ACTIVITY_WRITE_EVERY_MS) {
      lastWrittenRef.current = now
      recordActivity(now)
    }
  }, [])

  const end = useCallback(
    (reason: SignOutReason) => {
      update(null)
      clearActivity()
      lastActiveRef.current = null
      setWarning(null)
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
      markActive(true)
      update({ session: next, remember })
    },
    [api, markActive, update],
  )

  const signOut = useCallback(async () => {
    const current = storedRef.current?.session
    end('signed_out')
    // Best effort: the session is already gone on this side.
    if (current) await api.signOut(current.refreshToken).catch(() => undefined)
  }, [api, end])

  const stayActive = useCallback(() => markActive(true), [markActive])

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

  // While signed in: note activity, and check the session every second. Ends it after
  // inactivity or at its fixed end, and raises a warning shortly before either.
  useEffect(() => {
    if (!session) return
    // After a reload, the time stored by any tab counts, so being away (even with the
    // browser closed) still counts as inactivity.
    lastActiveRef.current ??= storedActivity() ?? Date.now()
    const onActivity = () => markActive()
    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, onActivity, { passive: true, capture: true })
    }

    const check = () => {
      const lastActiveAt = Math.max(lastActiveRef.current ?? 0, storedActivity() ?? 0)
      const state = sessionState(session, lastActiveAt, Date.now(), policy)
      if (state.kind === 'expired' || state.kind === 'inactive') {
        end(state.kind)
        return
      }
      // Keep the same object while the kind is unchanged, so nothing re-renders every second.
      setWarning((current) =>
        state.kind === 'active' ? null : current?.kind === state.kind ? current : state,
      )
    }
    check()
    const timer = window.setInterval(check, policy.checkEveryMs)

    return () => {
      window.clearInterval(timer)
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, onActivity, { capture: true })
      }
    }
  }, [session, policy, end, markActive])

  // Signing in or out in another tab applies here too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY) return
      const next = loadSession()
      storedRef.current = next
      setStored(next)
      if (!next) {
        setWarning(null)
        queryClient.clear()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  const clearEndReason = useCallback(() => setEndReason(null), [])

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      endReason,
      clearEndReason,
      warning,
      stayActive,
      signIn,
      signOut,
    }),
    [session, endReason, clearEndReason, warning, stayActive, signIn, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
