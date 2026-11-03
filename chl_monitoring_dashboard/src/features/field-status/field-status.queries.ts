import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fieldStatusApi } from './field-status.api'
import type { FieldStatusFilters } from './field-status.schemas'

export const fieldStatusKeys = {
  fieldStatus: (filters: FieldStatusFilters) =>
    [
      'field-status',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** Agents' last-reported device status for an area and period; the previous answer stays while another loads. */
export function useFieldStatus(filters: FieldStatusFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: fieldStatusKeys.fieldStatus(filters),
    queryFn: () => fieldStatusApi.getFieldStatus(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
