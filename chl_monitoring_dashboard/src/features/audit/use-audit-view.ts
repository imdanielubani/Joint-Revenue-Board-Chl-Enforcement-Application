import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The register's filters, as address parameters. */
export const AUDIT_FILTERS = ['method', 'result', 'attempt', 'action', 'sync'] as const
export type AuditFilterKey = (typeof AUDIT_FILTERS)[number]
export type AuditRegisterFilters = Record<AuditFilterKey, string | null>

/** The address parameters the page keeps its state in. */
export const AUDIT_PARAMS = {
  /** An entry's reference, opened in its popup. */
  entry: 'entry',
} as const

/** The register's filters and open entry, kept in the address so a refresh or a shared link keeps them. */
export function useAuditView() {
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
    AUDIT_FILTERS.map((key) => [key, params.get(key)]),
  ) as AuditRegisterFilters

  const setFilter = useCallback(
    (key: AuditFilterKey, value: string | null) => change({ [key]: value }),
    [change],
  )

  /** The address for the register with these filters, keeping the area, period and people. */
  const linkTo = useCallback(
    (wanted: Partial<AuditRegisterFilters> = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      for (const key of AUDIT_FILTERS) {
        const value = wanted[key]
        if (value) query.set(key, value)
      }
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  const openEntry = useCallback(
    (reference: string | null) => change({ [AUDIT_PARAMS.entry]: reference }),
    [change],
  )

  return {
    filters,
    setFilter,
    linkTo,
    entryReference: params.get(AUDIT_PARAMS.entry),
    openEntry,
  }
}
