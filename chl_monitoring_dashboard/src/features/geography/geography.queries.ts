import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { geographyApi } from './geography.api'
import type { GeographyFilters } from './geography.schemas'

export const geographyKeys = {
  all: ['geography'] as const,
  detail: (filters: GeographyFilters) =>
    ['geography', filters.scope, filters.range, filters.from, filters.to] as const,
}

/** The areas under the scope and its enforcement points; the previous answer stays while another loads. */
export function useGeography(filters: GeographyFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: geographyKeys.detail(filters),
    queryFn: () => geographyApi.getGeography(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
