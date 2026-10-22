import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockEvidenceApi } from '@/mocks/mock-evidence-api'
import {
  evidenceMonitoringSchema,
  type EvidenceFilters,
  type EvidenceMonitoring,
} from './evidence.schemas'

export interface EvidenceApi {
  /** The evidence captured in the area and period: photographs, metadata, notes and related records. */
  getMonitoring(filters: EvidenceFilters): Promise<EvidenceMonitoring>
}

// The path is provisional until the backend's API is agreed. Read-only: nothing is ever uploaded.
const httpEvidenceApi: EvidenceApi = {
  getMonitoring: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/evidence/monitoring', evidenceMonitoringSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const evidenceApi: EvidenceApi = env.useMocks ? mockEvidenceApi : httpEvidenceApi
