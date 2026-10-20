import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { tripsApi } from './trips.api'
import type { TripsFilters } from './trips.schemas'

export const tripsKeys = {
  monitoring: (filters: TripsFilters) =>
    ['trips', 'monitoring', filters.scope, filters.range, filters.from, filters.to] as const,
}

/** The trips in an area and period; the previous answer stays while another loads. */
export function useTripsMonitoring(filters: TripsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: tripsKeys.monitoring(filters),
    queryFn: () => tripsApi.getMonitoring(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
