import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { paymentsApi } from './payments.api'
import type { PaymentsFilters } from './payments.schemas'

export const paymentsKeys = {
  monitoring: (filters: PaymentsFilters) =>
    [
      'payments',
      'monitoring',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The demand notices in an area and period; the previous answer stays while another loads. */
export function usePaymentsMonitoring(filters: PaymentsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: paymentsKeys.monitoring(filters),
    queryFn: () => paymentsApi.getMonitoring(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
