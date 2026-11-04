import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockSearchApi } from '@/mocks/mock-search-api'
import { searchResultsSchema, type SearchFilters, type SearchResults } from './search.schemas'

export interface SearchApi {
  /** Vehicles, agents and records by reference matching the query in the area. Read-only. */
  search(filters: SearchFilters): Promise<SearchResults>
}

// The path is provisional until the backend's API is agreed.
const httpSearchApi: SearchApi = {
  search: ({ query, scope }) =>
    request('/api/v1/search', searchResultsSchema, { query: { q: query, scope } }),
}

export const searchApi: SearchApi = env.useMocks ? mockSearchApi : httpSearchApi
