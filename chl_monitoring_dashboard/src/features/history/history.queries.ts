import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { historyApi } from './history.api'
import type { HistoryFilters } from './history.schemas'

export const historyKeys = {
  history: (filters: HistoryFilters) =>
    [
      'history',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The verification history for an area and period; the previous answer stays while another loads. */
export function useVerificationHistory(filters: HistoryFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: historyKeys.history(filters),
    queryFn: () => historyApi.getHistory(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
