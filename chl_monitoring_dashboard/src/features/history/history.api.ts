import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockHistoryApi } from '@/mocks/mock-history-api'
import {
  verificationHistorySchema,
  type HistoryFilters,
  type VerificationHistory,
} from './history.schemas'

export interface HistoryApi {
  /** The recorded verification attempts in the area and period, with what followed each. Read-only. */
  getHistory(filters: HistoryFilters): Promise<VerificationHistory>
}

// The path is provisional until the backend's API is agreed.
const httpHistoryApi: HistoryApi = {
  getHistory: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/verification-history', verificationHistorySchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const historyApi: HistoryApi = env.useMocks ? mockHistoryApi : httpHistoryApi
