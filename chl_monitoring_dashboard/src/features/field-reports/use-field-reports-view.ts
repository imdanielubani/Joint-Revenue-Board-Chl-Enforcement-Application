import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** The page's tabs: the field reports, then the loaded / empty confirmations. */
export const FIELD_REPORT_VIEWS = ['reports', 'loads'] as const
export type FieldReportsView = (typeof FIELD_REPORT_VIEWS)[number]

/** The address parameters the page keeps its state in. */
export const FIELD_REPORT_PARAMS = {
  view: 'view',
  /** A report type: "vehicle", "driver", "situation" or "general". */
  type: 'type',
  /** "loaded" or "empty". */
  load: 'load',
  /** "live" or "offline": how it reached CHL. */
  source: 'source',
} as const

/** The tab and the registers' filters, kept in the address so a refresh or a shared link keeps them. */
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
  /** Lists one type of report, or loaded or empty, in its register; the other filters cleared. */
  const showInRegister = useCallback(
    (next: FieldReportsView, value: string) =>
      change({
        [FIELD_REPORT_PARAMS.view]: next,
        [FIELD_REPORT_PARAMS.type]: next === 'reports' ? value : null,
        [FIELD_REPORT_PARAMS.load]: next === 'loads' ? value : null,
        [FIELD_REPORT_PARAMS.source]: null,
      }),
    [change],
  )
  const setType = useCallback(
    (type: string | null) => change({ [FIELD_REPORT_PARAMS.type]: type }),
    [change],
  )
  const setLoad = useCallback(
    (load: string | null) => change({ [FIELD_REPORT_PARAMS.load]: load }),
    [change],
  )
  const setSource = useCallback(
    (source: string | null) => change({ [FIELD_REPORT_PARAMS.source]: source }),
    [change],
  )

  return {
    view,
    type: params.get(FIELD_REPORT_PARAMS.type),
    load: params.get(FIELD_REPORT_PARAMS.load),
    source: params.get(FIELD_REPORT_PARAMS.source),
    setView,
    showInRegister,
    setType,
    setLoad,
    setSource,
  }
}
