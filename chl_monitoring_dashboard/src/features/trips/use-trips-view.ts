import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

/** The page's tabs: the document's six submodules. */
export const TRIP_VIEWS = [
  'active',
  'no-active',
  'previous',
  'no-history',
  'destination',
  'post-payment',
] as const
export type TripsView = (typeof TRIP_VIEWS)[number]

/** The address parameters for the tab, a plate to look up and an open trip. */
export const TRIP_PARAMS = {
  view: 'view',
  /** A plate, as Verifications & E-Tags links to a vehicle's trips. */
  plate: 'plate',
  /** A transaction reference, opened in the trip's details. */
  trip: 'trip',
} as const

/**
 * The tab, plate and open trip, kept in the address so a refresh or a shared
 * link keeps them. `fallbackFor` gives the tab shown when the address names
 * none, from the plate it names (if any).
 */
export function useTripsView(fallbackFor: (plate: string) => TripsView) {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const requested = TRIP_VIEWS.find((view) => view === params.get(TRIP_PARAMS.view))
  const plate = params.get(TRIP_PARAMS.plate) ?? ''

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

  /** The address for a tab, keeping the area and period. */
  const linkTo = useCallback(
    (view: TripsView) => {
      const next = new URLSearchParams()
      for (const key of Object.values(FILTER_PARAMS)) {
        const value = params.get(key)
        if (value) next.set(key, value)
      }
      next.set(TRIP_PARAMS.view, view)
      return `${pathname}?${next}`
    },
    [params, pathname],
  )

  return {
    view: requested ?? fallbackFor(plate),
    plate,
    trip: params.get(TRIP_PARAMS.trip),
    linkTo,
    setView: useCallback((view: TripsView) => change({ [TRIP_PARAMS.view]: view }), [change]),
    openTrip: useCallback(
      (reference: string | null) => change({ [TRIP_PARAMS.trip]: reference }),
      [change],
    ),
  }
}
