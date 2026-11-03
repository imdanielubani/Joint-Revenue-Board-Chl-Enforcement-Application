import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { syncApi } from './sync.api'
import type { SyncFilters } from './sync.schemas'

export const syncKeys = {
  synchronization: (filters: SyncFilters) =>
    [
      'sync',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The received records' synchronization for an area and period; the previous answer stays while another loads. */
export function useSynchronization(filters: SyncFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: syncKeys.synchronization(filters),
    queryFn: () => syncApi.getSynchronization(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
