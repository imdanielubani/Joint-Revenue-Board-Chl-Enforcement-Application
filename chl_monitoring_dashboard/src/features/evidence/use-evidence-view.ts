import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The page's tabs: all evidence records, the two kinds of evidence, and the agents' notes. */
export const EVIDENCE_VIEWS = ['records', 'vehicle', 'etag', 'notes'] as const
export type EvidenceView = (typeof EVIDENCE_VIEWS)[number]

/** The address parameters for the tab and the evidence open in the viewer. */
export const EVIDENCE_PARAMS = {
  view: 'view',
  /** A violation reference, as other pages link to its evidence ("View photographs"). */
  record: 'record',
} as const

/** The tab and the open evidence, kept in the address so a refresh or a shared link keeps them. */
export function useEvidenceView() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const view =
    EVIDENCE_VIEWS.find((entry) => entry === params.get(EVIDENCE_PARAMS.view)) ?? 'records'

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
    (next: EvidenceView) => {
      const query = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      query.set(EVIDENCE_PARAMS.view, next)
      return `${pathname}?${query}`
    },
    [params, pathname],
  )

  const setView = useCallback(
    (next: EvidenceView) => change({ [EVIDENCE_PARAMS.view]: next }),
    [change],
  )
  const openRecord = useCallback(
    (violationId: string | null) => change({ [EVIDENCE_PARAMS.record]: violationId }),
    [change],
  )

  return { view, record: params.get(EVIDENCE_PARAMS.record), linkTo, setView, openRecord }
}
