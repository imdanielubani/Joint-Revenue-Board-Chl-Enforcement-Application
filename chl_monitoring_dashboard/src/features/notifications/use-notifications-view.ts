import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The page's tabs: every notification, then each group the document names (SRD 11.2 to 11.4). */
export const NOTIFICATION_VIEWS = ['all', 'enforcement', 'field', 'operational'] as const
export type NotificationsView = (typeof NOTIFICATION_VIEWS)[number]

/** The address parameters the page keeps its state in. */
export const NOTIFICATION_PARAMS = {
  view: 'view',
  /** "unread" or "read". */
  status: 'status',
  /** A notification type, such as "sos". */
  type: 'type',
  /** A notification, opened in its popup. */
  notification: 'notification',
} as const

/** The tab and the register's filters, kept in the address so a refresh or a shared link keeps them. */
export function useNotificationsView() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
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

  /** The address for a tab and its filters, keeping the area, period and people. */
  const linkTo = useCallback(
    (next: NotificationsView, filters: { status?: string; type?: string } = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      query.set(NOTIFICATION_PARAMS.view, next)
      if (filters.status) query.set(NOTIFICATION_PARAMS.status, filters.status)
      if (filters.type) query.set(NOTIFICATION_PARAMS.type, filters.type)
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  // A type belongs to one group, so another tab starts with the type filter cleared.
  const setView = useCallback(
    (next: NotificationsView) =>
      change({ [NOTIFICATION_PARAMS.view]: next, [NOTIFICATION_PARAMS.type]: null }),
    [change],
  )
  const setStatus = useCallback(
    (status: string | null) => change({ [NOTIFICATION_PARAMS.status]: status }),
    [change],
  )
  const setType = useCallback(
    (type: string | null) => change({ [NOTIFICATION_PARAMS.type]: type }),
    [change],
  )

  const openNotification = useCallback(
    (id: string | null) => change({ [NOTIFICATION_PARAMS.notification]: id }),
    [change],
  )

  return {
    view,
    notificationId: params.get(NOTIFICATION_PARAMS.notification),
    linkTo,
    openNotification,
    status: params.get(NOTIFICATION_PARAMS.status),
    type: params.get(NOTIFICATION_PARAMS.type),
    setView,
    setStatus,
    setType,
  }
}
