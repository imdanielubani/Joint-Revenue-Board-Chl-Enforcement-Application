import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockFieldStatusApi } from '@/mocks/mock-field-status-api'
import {
  fieldStatusSchema,
  type FieldStatus,
  type FieldStatusFilters,
} from './field-status.schemas'

export interface FieldStatusApi {
  /** Each agent's last-reported device status in the area and period, where CHL supplies it. Read-only. */
  getFieldStatus(filters: FieldStatusFilters): Promise<FieldStatus>
}

// The path is provisional until the backend's API is agreed.
const httpFieldStatusApi: FieldStatusApi = {
  getFieldStatus: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/field-status', fieldStatusSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const fieldStatusApi: FieldStatusApi = env.useMocks ? mockFieldStatusApi : httpFieldStatusApi
