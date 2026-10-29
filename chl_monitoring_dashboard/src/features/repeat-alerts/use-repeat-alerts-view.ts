import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The address parameters the page keeps its state in. */
export const REPEAT_ALERT_PARAMS = {
  /** "none" or "partial". */
  followUp: 'follow_up',
  /** "unread", "read" or "none": whether the supervisory process sent a notification, and if read. */
  notified: 'notified',
} as const

/** The register's filters, kept in the address so a refresh or a shared link keeps them. */
export function useRepeatAlertsView() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()

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

  /** The address for the register with these filters, keeping the area, period and people. */
  const linkTo = useCallback(
    (filters: { followUp?: string; notified?: string } = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      if (filters.followUp) query.set(REPEAT_ALERT_PARAMS.followUp, filters.followUp)
      if (filters.notified) query.set(REPEAT_ALERT_PARAMS.notified, filters.notified)
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  const setFollowUp = useCallback(
    (value: string | null) => change({ [REPEAT_ALERT_PARAMS.followUp]: value }),
    [change],
  )
  const setNotified = useCallback(
    (value: string | null) => change({ [REPEAT_ALERT_PARAMS.notified]: value }),
    [change],
  )

  return {
    followUp: params.get(REPEAT_ALERT_PARAMS.followUp),
    notified: params.get(REPEAT_ALERT_PARAMS.notified),
    linkTo,
    setFollowUp,
    setNotified,
  }
}
