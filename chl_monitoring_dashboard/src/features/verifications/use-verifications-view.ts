import { useCallback, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'
import { NO_FILTERS, type RegisterFilters } from './verifications-filters'

/** The page's four tabs. */
export const VIEWS = ['records', 'vehicles', 'outcomes', 'sync'] as const
export type VerificationsView = (typeof VIEWS)[number]

/** The address parameters for the tab, the register's filters, a plate and an open record. */
export const VIEW_PARAMS = {
  view: 'view',
  query: 'q',
  method: 'method',
  outcome: 'outcome',
  provenance: 'source',
  etag: 'etag',
  sync: 'sync',
  attempt: 'attempt',
  /** A plate to look up in Vehicle identity, as other pages link to it. */
  plate: 'plate',
  /** A verification reference, opened in the details popup. */
  reference: 'ref',
} as const

const FILTER_KEYS = ['method', 'outcome', 'provenance', 'etag', 'sync', 'attempt'] as const

/**
 * The tab, register filters and open verification, kept in the address so a
 * refresh or a shared link keeps them. A plate on its own opens Vehicle identity.
 */
export function useVerificationsView() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()

  const plate = params.get(VIEW_PARAMS.plate) ?? ''
  const requested = VIEWS.find((view) => view === params.get(VIEW_PARAMS.view))
  const view: VerificationsView = requested ?? (plate ? 'vehicles' : 'records')
  const reference = params.get(VIEW_PARAMS.reference)

  const filters = useMemo<RegisterFilters>(() => {
    const next: RegisterFilters = { ...NO_FILTERS, query: params.get(VIEW_PARAMS.query) ?? '' }
    for (const key of FILTER_KEYS) next[key] = params.get(VIEW_PARAMS[key]) || null
    return next
  }, [params])

  /** The address for a tab (and register filters), keeping the area, period and people. */
  const linkTo = useCallback(
    (nextView: VerificationsView, nextFilters: Partial<RegisterFilters> = {}) => {
      const next = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) next.set(key, value)
      }
      next.set(VIEW_PARAMS.view, nextView)
      for (const [key, value] of Object.entries(nextFilters)) {
        if (value) next.set(VIEW_PARAMS[key as keyof RegisterFilters], value)
      }
      return `${pathname}?${next}`
    },
    [params, pathname],
  )

  const change = useCallback(
    (changes: Record<string, string | null>, replace = false) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        { replace },
      ),
    [setParams],
  )

  const setView = useCallback(
    (next: VerificationsView) => change({ [VIEW_PARAMS.view]: next }),
    [change],
  )
  /** The register's filters as they are typed or chosen: no new history entry for each. */
  const setFilters = useCallback(
    (next: RegisterFilters) =>
      change(
        Object.fromEntries(
          (Object.keys(next) as (keyof RegisterFilters)[]).map((key) => [
            VIEW_PARAMS[key],
            next[key] || null,
          ]),
        ),
        true,
      ),
    [change],
  )
  /** Lists exactly these records in the register: the other filters are cleared. */
  const showRecords = useCallback(
    (only: Partial<RegisterFilters>) =>
      change({
        [VIEW_PARAMS.view]: 'records',
        ...Object.fromEntries(
          (Object.keys(NO_FILTERS) as (keyof RegisterFilters)[]).map((key) => [
            VIEW_PARAMS[key],
            only[key] || null,
          ]),
        ),
      }),
    [change],
  )
  const showVehicle = useCallback(
    (nextPlate: string) =>
      change({
        [VIEW_PARAMS.view]: 'vehicles',
        [VIEW_PARAMS.plate]: nextPlate,
        [VIEW_PARAMS.reference]: null,
      }),
    [change],
  )
  const openRecord = useCallback(
    (nextReference: string | null) => change({ [VIEW_PARAMS.reference]: nextReference }),
    [change],
  )

  return {
    view,
    filters,
    plate,
    reference,
    linkTo,
    setView,
    setFilters,
    showRecords,
    showVehicle,
    openRecord,
  }
}
