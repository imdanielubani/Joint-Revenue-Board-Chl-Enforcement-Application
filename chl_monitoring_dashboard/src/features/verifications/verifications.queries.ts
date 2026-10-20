import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { verificationsApi } from './verifications.api'
import type { VerificationsFilters } from './verifications.schemas'

export const verificationsKeys = {
  monitoring: (filters: VerificationsFilters) =>
    [
      'verifications',
      'monitoring',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The verifications in an area and period; the previous answer stays while another loads. */
export function useVerificationsMonitoring(filters: VerificationsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: verificationsKeys.monitoring(filters),
    queryFn: () => verificationsApi.getMonitoring(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
