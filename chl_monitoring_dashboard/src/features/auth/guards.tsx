import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation, type Location } from 'react-router'
import { paths } from '@/config/paths'
import { NoAccess } from '@/shared/ui/NoAccess'
import type { ModuleKey } from './auth.schemas'
import { SessionWarnings } from './components/SessionWarnings'
import { useSession } from './session-context'

/**
 * Sends anyone who isn't signed in to the sign-in page, remembering where they were going.
 * While signed in, warns before the session ends.
 */
export function RequireAuth() {
  const { session } = useSession()
  const location = useLocation()
  if (!session) return <Navigate to={paths.signIn} replace state={{ from: location }} />
  return (
    <>
      <SessionWarnings />
      <Outlet />
    </>
  )
}

/**
 * Keeps signed-in users off the sign-in pages. Right after sign-in it sends
 * them to the page they were going to before being asked to sign in.
 */
export function RedirectIfSignedIn() {
  const { session } = useSession()
  const from = (useLocation().state as { from?: Location } | null)?.from
  if (session) return <Navigate to={from ? `${from.pathname}${from.search}` : paths.home} replace />
  return <Outlet />
}

/** Shows a module only to users CHL allows to open it. */
export function RequireModule({ module, children }: { module: ModuleKey; children?: ReactNode }) {
  const { user } = useSession()
  if (!user?.modules.includes(module)) return <NoAccess />
  return children ?? <Outlet />
}
