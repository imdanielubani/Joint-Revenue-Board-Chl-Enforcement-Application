import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** The page's tabs: every notification, then each group the document names (SRD 11.2 to 11.4). */
export const NOTIFICATION_VIEWS = ['all', 'enforcement', 'field', 'operational'] as const
export type NotificationsView = (typeof NOTIFICATION_VIEWS)[number]

/** The address parameters the page keeps its state in. */
export const NOTIFICATION_PARAMS = {
  view: 'view',
} as const

/** The tab, kept in the address so a refresh or a shared link keeps it. */
export function useNotificationsView() {
  const [params, setParams] = useSearchParams()
  const requested = params.get(NOTIFICATION_PARAMS.view)
  const view: NotificationsView = NOTIFICATION_VIEWS.find((entry) => entry === requested) ?? 'all'

  const change = useCallback(
    (changes: Record<string, string | null>) =>
      setParams((current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      }),
    [setParams],
  )

  const setView = useCallback(
    (next: NotificationsView) => change({ [NOTIFICATION_PARAMS.view]: next }),
    [change],
  )

  return { view, setView }
}
