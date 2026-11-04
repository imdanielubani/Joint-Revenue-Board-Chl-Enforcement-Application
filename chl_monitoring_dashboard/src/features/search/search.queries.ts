import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchApi } from './search.api'
import type { SearchFilters } from './search.schemas'

export const searchKeys = {
  search: ({ query, scope }: SearchFilters) => ['search', scope, query] as const,
}

/** The search's results; the previous answer stays while another loads. */
export function useSearch(filters: SearchFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: searchKeys.search(filters),
    queryFn: () => searchApi.search(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
