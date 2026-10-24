import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/**
 * The page's tabs: the document's sections 8.1, 8.4 and 8.5. The categories
 * (8.2) and status views (8.3) are cards of their own above them; an older
 * `?view=categories` or `?view=statuses` link opens the register under them.
 */
export const VIOLATION_VIEWS = ['register', 'unresolved', 'history'] as const
export type ViolationsView = (typeof VIOLATION_VIEWS)[number]

/** The address parameters other pages link with, and the page keeps its state in. */
export const VIOLATION_PARAMS = {
  view: 'view',
  /** A violation, opened as its case record. */
  case: 'case',
  category: 'category',
  /** A status; "unresolved" opens Unresolved Cases. */
  status: 'status',
  /** A plate, searched for in the register. */
  plate: 'plate',
} as const

/** The address's older views: repeat-vehicle reports are among the unresolved cases. */
const REPEAT_VIEW = 'repeat-vehicles'

/**
 * The tab, filters and open case, kept in the address so a refresh or a shared
 * link keeps them, as the Overview, Command centre and other pages link here.
 */
export function useViolationsView() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const requestedView = params.get(VIOLATION_PARAMS.view)
  const requestedStatus = params.get(VIOLATION_PARAMS.status)
  const repeatOnly = requestedView === REPEAT_VIEW
  const view: ViolationsView =
    VIOLATION_VIEWS.find((entry) => entry === requestedView) ??
    (repeatOnly || requestedStatus === 'unresolved' ? 'unresolved' : 'register')
  const status = requestedStatus && requestedStatus !== 'unresolved' ? requestedStatus : null

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

  /** The address for a tab, keeping the area, period and people. */
  const linkTo = useCallback(
    (next: ViolationsView, filters: { status?: string } = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      query.set(VIOLATION_PARAMS.view, next)
      if (filters.status) query.set(VIOLATION_PARAMS.status, filters.status)
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  const setView = useCallback(
    (next: ViolationsView) =>
      change({ [VIOLATION_PARAMS.view]: next, [VIOLATION_PARAMS.status]: status }),
    [change, status],
  )
  /** Lists these violations in the register: the category and status filters are set, or cleared. */
  const showInRegister = useCallback(
    (filters: { category?: string | null; status?: string | null }) =>
      change({
        [VIOLATION_PARAMS.view]: 'register',
        [VIOLATION_PARAMS.category]: filters.category ?? null,
        [VIOLATION_PARAMS.status]: filters.status ?? null,
      }),
    [change],
  )
  const setCategory = useCallback(
    (category: string | null) => change({ [VIOLATION_PARAMS.category]: category }),
    [change],
  )
  const setStatus = useCallback(
    (next: string | null) => change({ [VIOLATION_PARAMS.status]: next }),
    [change],
  )
  const openCase = useCallback(
    (id: string | null) => change({ [VIOLATION_PARAMS.case]: id }),
    [change],
  )

  return {
    view,
    caseId: params.get(VIOLATION_PARAMS.case),
    category: params.get(VIOLATION_PARAMS.category),
    status,
    plate: params.get(VIOLATION_PARAMS.plate) ?? '',
    repeatOnly,
    linkTo,
    setView,
    showInRegister,
    setCategory,
    setStatus,
    openCase,
  }
}
