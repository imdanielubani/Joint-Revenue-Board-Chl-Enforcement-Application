import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The register's filters, as address parameters. */
export const SYNC_FILTERS = ['source', 'sync'] as const
export type SyncFilterKey = (typeof SYNC_FILTERS)[number]
export type SyncRegisterFilters = Record<SyncFilterKey, string | null>

/** The address parameters the page keeps its state in. */
export const SYNC_PARAMS = {
  /** A record's reference, opened in its record details. */
  record: 'record',
} as const

/** The register's filters and open record, kept in the address so a refresh or a shared link keeps them. */
export function useSyncView() {
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
    SYNC_FILTERS.map((key) => [key, params.get(key)]),
  ) as SyncRegisterFilters

  const setFilter = useCallback(
    (key: SyncFilterKey, value: string | null) => change({ [key]: value }),
    [change],
  )

  /** The address for the register with these filters, keeping the area, period and people. */
  const linkTo = useCallback(
    (wanted: Partial<SyncRegisterFilters> = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      for (const key of SYNC_FILTERS) {
        const value = wanted[key]
        if (value) query.set(key, value)
      }
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  const openRecord = useCallback(
    (reference: string | null) => change({ [SYNC_PARAMS.record]: reference }),
    [change],
  )

  return {
    filters,
    setFilter,
    linkTo,
    recordReference: params.get(SYNC_PARAMS.record),
    openRecord,
  }
}
