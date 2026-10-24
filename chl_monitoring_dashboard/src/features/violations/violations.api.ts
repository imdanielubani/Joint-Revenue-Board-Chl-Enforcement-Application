import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockViolationsApi } from '@/mocks/mock-violations-api'
import {
  violationsMonitoringSchema,
  type ViolationsFilters,
  type ViolationsMonitoring,
} from './violations.schemas'

export const violationsSummarySchema = z.object({
  /** Unresolved or escalated cases that need attention, in the user's areas. */
  needingAttention: z.number().int().nonnegative(),
})
export type ViolationsSummary = z.infer<typeof violationsSummarySchema>

export interface ViolationsApi {
  getSummary(): Promise<ViolationsSummary>
  /** The violations received by CHL in the area and period, as case records. Read-only. */
  getMonitoring(filters: ViolationsFilters): Promise<ViolationsMonitoring>
}

// The paths are provisional until the backend's API is agreed.
const httpViolationsApi: ViolationsApi = {
  getSummary: () => request('/api/v1/violations/summary', violationsSummarySchema),
  getMonitoring: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/violations/monitoring', violationsMonitoringSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const violationsApi: ViolationsApi = env.useMocks ? mockViolationsApi : httpViolationsApi
