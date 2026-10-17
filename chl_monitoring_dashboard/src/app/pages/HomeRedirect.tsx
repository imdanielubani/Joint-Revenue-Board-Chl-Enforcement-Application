import { Navigate } from 'react-router'
import { useCurrentUser } from '@/features/auth/session-context'
import { NoAccess } from '@/shared/ui/NoAccess'
import { modulesFor } from '../modules'

/** "/" opens the first module this user may see. */
export function HomeRedirect() {
  const [first] = modulesFor(useCurrentUser())
  if (!first) return <NoAccess />
  return <Navigate to={first.path} replace />
}
