import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockVerificationsApi } from '@/mocks/mock-verifications-api'
import {
  verificationsMonitoringSchema,
  type VerificationsFilters,
  type VerificationsMonitoring,
} from './verifications.schemas'

export interface VerificationsApi {
  /** The verifications in the area and period, with their E-Tag results and what followed. */
  getMonitoring(filters: VerificationsFilters): Promise<VerificationsMonitoring>
}

// The path is provisional until the backend's API is agreed.
const httpVerificationsApi: VerificationsApi = {
  getMonitoring: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/verifications/monitoring', verificationsMonitoringSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const verificationsApi: VerificationsApi = env.useMocks
  ? mockVerificationsApi
  : httpVerificationsApi
