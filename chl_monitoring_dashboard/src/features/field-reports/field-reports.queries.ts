import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fieldReportsApi } from './field-reports.api'
import type { FieldReportsFilters } from './field-reports.schemas'

export const fieldReportsKeys = {
  list: (filters: FieldReportsFilters) =>
    [
      'field-reports',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The field reports in an area and period; the previous answer stays while another loads. */
export function useFieldReports(filters: FieldReportsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: fieldReportsKeys.list(filters),
    queryFn: () => fieldReportsApi.getFieldReports(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
