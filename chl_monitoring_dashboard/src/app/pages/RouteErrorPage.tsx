import { useRouteError } from 'react-router'
import { StatePanel } from '@/shared/ui/StatePanel'

/** Shown when a page crashes, instead of a blank screen. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <StatePanel kind="error" error={error} onRetry={() => window.location.reload()} />
    </div>
  )
}
