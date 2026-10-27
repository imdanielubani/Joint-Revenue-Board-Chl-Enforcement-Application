import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** The page's tabs: the field reports, then the loaded / empty confirmations. */
export const FIELD_REPORT_VIEWS = ['reports', 'loads'] as const
export type FieldReportsView = (typeof FIELD_REPORT_VIEWS)[number]

/** The address parameters the page keeps its state in. */
export const FIELD_REPORT_PARAMS = {
  view: 'view',
} as const

/** The tab, kept in the address so a refresh or a shared link keeps it. */
export function useFieldReportsView() {
  const [params, setParams] = useSearchParams()
  const requested = params.get(FIELD_REPORT_PARAMS.view)
  const view: FieldReportsView =
    FIELD_REPORT_VIEWS.find((entry) => entry === requested) ?? 'reports'

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
    (next: FieldReportsView) => change({ [FIELD_REPORT_PARAMS.view]: next }),
    [change],
  )

  return { view, setView }
}
