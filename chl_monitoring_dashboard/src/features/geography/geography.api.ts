import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockGeographyApi } from '@/mocks/mock-geography-api'
import { geographySchema, type Geography, type GeographyFilters } from './geography.schemas'

export interface GeographyApi {
  getGeography(filters: GeographyFilters): Promise<Geography>
}

// The path is provisional until the backend's API is agreed.
const httpGeographyApi: GeographyApi = {
  getGeography: ({ scope, range, from, to }) =>
    request('/api/v1/geography', geographySchema, { query: { scope, range, from, to } }),
}

export const geographyApi: GeographyApi = env.useMocks ? mockGeographyApi : httpGeographyApi
