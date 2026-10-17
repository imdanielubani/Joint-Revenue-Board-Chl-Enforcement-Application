import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { overviewApi } from './overview.api'
import type { OverviewFilters } from './overview.schemas'

export const overviewKeys = {
  all: ['overview'] as const,
  detail: (filters: OverviewFilters) =>
    [
      'overview',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/**
 * The Overview's figures for one area and period; refreshed every minute. While
 * another area or period loads, the previous figures stay on screen.
 */
export function useOverview(filters: OverviewFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: overviewKeys.detail(filters),
    queryFn: () => overviewApi.getOverview(filters),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}
