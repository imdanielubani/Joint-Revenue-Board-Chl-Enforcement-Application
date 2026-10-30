import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi } from './audit.api'
import type { AuditFilters } from './audit.schemas'

export const auditKeys = {
  trail: (filters: AuditFilters) =>
    [
      'audit',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The audit trail for an area and period; the previous answer stays while another loads. */
export function useAuditTrail(filters: AuditFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: auditKeys.trail(filters),
    queryFn: () => auditApi.getAuditTrail(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
