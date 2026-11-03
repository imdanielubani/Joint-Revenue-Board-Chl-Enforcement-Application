import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The register's filters, as address parameters. */
export const FIELD_STATUS_FILTERS = ['rfid', 'internet', 'gps'] as const
export type FieldStatusFilterKey = (typeof FIELD_STATUS_FILTERS)[number]
export type FieldStatusRegisterFilters = Record<FieldStatusFilterKey, string | null>

/** The register's filters, kept in the address so a refresh or a shared link keeps them. */
export function useFieldStatusView() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()

  const filters = Object.fromEntries(
    FIELD_STATUS_FILTERS.map((key) => [key, params.get(key)]),
  ) as FieldStatusRegisterFilters

  const setFilter = useCallback(
    (key: FieldStatusFilterKey, value: string | null) =>
      setParams((current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      }),
    [setParams],
  )

  /** The address for the register with these filters, keeping the area, period and people. */
  const linkTo = useCallback(
    (wanted: Partial<FieldStatusRegisterFilters> = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      for (const key of FIELD_STATUS_FILTERS) {
        const value = wanted[key]
        if (value) query.set(key, value)
      }
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  return { filters, setFilter, linkTo }
}
