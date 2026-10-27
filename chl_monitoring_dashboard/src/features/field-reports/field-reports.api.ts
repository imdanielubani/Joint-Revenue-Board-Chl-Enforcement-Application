import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockFieldReportsApi } from '@/mocks/mock-field-reports-api'
import {
  fieldReportsSchema,
  type FieldReports,
  type FieldReportsFilters,
} from './field-reports.schemas'

export interface FieldReportsApi {
  /** The field reports and loaded / empty confirmations CHL received in the area and period. Read-only. */
  getFieldReports(filters: FieldReportsFilters): Promise<FieldReports>
}

// The path is provisional until the backend's API is agreed.
const httpFieldReportsApi: FieldReportsApi = {
  getFieldReports: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/field-reports', fieldReportsSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const fieldReportsApi: FieldReportsApi = env.useMocks
  ? mockFieldReportsApi
  : httpFieldReportsApi
