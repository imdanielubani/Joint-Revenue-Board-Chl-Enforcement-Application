import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { evidenceApi } from './evidence.api'
import type { EvidenceFilters } from './evidence.schemas'

export const evidenceKeys = {
  monitoring: (filters: EvidenceFilters) =>
    [
      'evidence',
      'monitoring',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The evidence in an area and period; the previous answer stays while another loads. */
export function useEvidenceMonitoring(filters: EvidenceFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: evidenceKeys.monitoring(filters),
    queryFn: () => evidenceApi.getMonitoring(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
