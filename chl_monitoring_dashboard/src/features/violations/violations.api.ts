import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockViolationsApi } from '@/mocks/mock-violations-api'

export const violationsSummarySchema = z.object({
  /** Unresolved or escalated cases that need attention, in the user's areas. */
  needingAttention: z.number().int().nonnegative(),
})
export type ViolationsSummary = z.infer<typeof violationsSummarySchema>

export interface ViolationsApi {
  getSummary(): Promise<ViolationsSummary>
}

// The path is provisional until the backend's API is agreed.
const httpViolationsApi: ViolationsApi = {
  getSummary: () => request('/api/v1/violations/summary', violationsSummarySchema),
}

export const violationsApi: ViolationsApi = env.useMocks ? mockViolationsApi : httpViolationsApi
