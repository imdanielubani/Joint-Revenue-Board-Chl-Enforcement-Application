import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/**
 * The page's tabs: the demand notice register, post-payment compliance and
 * related transactions. Payment status is a card of its own above them.
 */
export const PAYMENT_VIEWS = ['register', 'compliance', 'transactions'] as const
export type PaymentsView = (typeof PAYMENT_VIEWS)[number]

/** The address parameters other pages link with, and the page keeps its state in. */
export const PAYMENT_PARAMS = {
  view: 'view',
  /** A demand notice, opened in its details. */
  notice: 'notice',
  /** "pending" or "received", as the Overview links with. */
  status: 'status',
  method: 'method',
  /** A plate, searched for in the register. */
  plate: 'plate',
} as const

/**
 * The tab, filters and open notice, kept in the address so a refresh or a
 * shared link keeps them, as the Overview and other pages link here.
 */
export function usePaymentsView() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const requested = params.get(PAYMENT_PARAMS.view)
  const view: PaymentsView = PAYMENT_VIEWS.find((entry) => entry === requested) ?? 'register'

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
    (next: PaymentsView, filters: { status?: string } = {}) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      query.set(PAYMENT_PARAMS.view, next)
      if (filters.status) query.set(PAYMENT_PARAMS.status, filters.status)
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  const setView = useCallback(
    (next: PaymentsView) => change({ [PAYMENT_PARAMS.view]: next }),
    [change],
  )
  /** Lists these notices in the register: the status filter is set, the method cleared. */
  const showInRegister = useCallback(
    (status: string) =>
      change({
        [PAYMENT_PARAMS.view]: 'register',
        [PAYMENT_PARAMS.status]: status,
        [PAYMENT_PARAMS.method]: null,
      }),
    [change],
  )
  const setStatus = useCallback(
    (status: string | null) => change({ [PAYMENT_PARAMS.status]: status }),
    [change],
  )
  const setMethod = useCallback(
    (method: string | null) => change({ [PAYMENT_PARAMS.method]: method }),
    [change],
  )
  const openNotice = useCallback(
    (id: string | null) => change({ [PAYMENT_PARAMS.notice]: id }),
    [change],
  )

  return {
    view,
    noticeId: params.get(PAYMENT_PARAMS.notice),
    status: params.get(PAYMENT_PARAMS.status),
    method: params.get(PAYMENT_PARAMS.method),
    plate: params.get(PAYMENT_PARAMS.plate) ?? '',
    linkTo,
    setView,
    showInRegister,
    setStatus,
    setMethod,
    openNotice,
  }
}
