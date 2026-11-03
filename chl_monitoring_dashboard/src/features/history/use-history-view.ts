import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The register's filters, as address parameters. */
export const HISTORY_FILTERS = ['completion', 'action', 'violation', 'payment', 'pending'] as const
export type HistoryFilterKey = (typeof HISTORY_FILTERS)[number]
export type HistoryRegisterFilters = Record<HistoryFilterKey, string | null>

/** The register's filters, kept in the address so a refresh or a shared link keeps them. */
export function useHistoryView() {
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

  const filters = Object.fromEntries(
    HISTORY_FILTERS.map((key) => [key, params.get(key)]),
  ) as HistoryRegisterFilters

  const setFilter = useCallback(
    (key: HistoryFilterKey, value: string | null) => change({ [key]: value }),
    [change],
  )

  /** The address for the register with these filters, keeping the area, period and people. */
  const linkTo = useCallback(
    (wanted: Partial<HistoryRegisterFilters> = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      for (const key of HISTORY_FILTERS) {
        const value = wanted[key]
        if (value) query.set(key, value)
      }
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  return { filters, setFilter, linkTo, change }
}
