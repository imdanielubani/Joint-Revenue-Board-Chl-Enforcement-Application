import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { violationsApi } from './violations.api'
import type { ViolationsFilters } from './violations.schemas'

export const violationsKeys = {
  summary: ['violations', 'summary'] as const,
  monitoring: (filters: ViolationsFilters) =>
    [
      'violations',
      'monitoring',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** How many cases need attention, for the sidebar's marker; refreshed every minute. */
export function useViolationsSummary({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: violationsKeys.summary,
    queryFn: () => violationsApi.getSummary(),
    enabled,
    refetchInterval: 60_000,
  })
}

/** The violations in an area and period; the previous answer stays while another loads. */
export function useViolationsMonitoring(filters: ViolationsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: violationsKeys.monitoring(filters),
    queryFn: () => violationsApi.getMonitoring(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
