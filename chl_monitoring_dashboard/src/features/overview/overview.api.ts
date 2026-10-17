import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockOverviewApi } from '@/mocks/mock-overview-api'
import { overviewSchema, type Overview, type OverviewFilters } from './overview.schemas'

export interface OverviewApi {
  getOverview(filters: OverviewFilters): Promise<Overview>
}

// The path is provisional until the backend's API is agreed.
const httpOverviewApi: OverviewApi = {
  getOverview: ({ scope, range, agentId, organization }) =>
    request('/api/v1/overview', overviewSchema, {
      query: { scope, range, agent: agentId, organization },
    }),
}

export const overviewApi: OverviewApi = env.useMocks ? mockOverviewApi : httpOverviewApi
