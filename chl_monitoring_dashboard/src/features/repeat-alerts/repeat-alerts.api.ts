import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockRepeatAlertsApi } from '@/mocks/mock-repeat-alerts-api'
import {
  repeatAlertsSchema,
  type RepeatAlerts,
  type RepeatAlertsFilters,
} from './repeat-alerts.schemas'

export interface RepeatAlertsApi {
  /** The repeat-vehicle alerts in the area and period, with their reports and cases. Read-only. */
  getRepeatAlerts(filters: RepeatAlertsFilters): Promise<RepeatAlerts>
}

// The path is provisional until the backend's API is agreed.
const httpRepeatAlertsApi: RepeatAlertsApi = {
  getRepeatAlerts: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/repeat-alerts', repeatAlertsSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const repeatAlertsApi: RepeatAlertsApi = env.useMocks
  ? mockRepeatAlertsApi
  : httpRepeatAlertsApi
