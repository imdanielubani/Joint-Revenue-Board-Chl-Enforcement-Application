import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockAuditApi } from '@/mocks/mock-audit-api'
import { auditTrailSchema, type AuditFilters, type AuditTrail } from './audit.schemas'

export interface AuditApi {
  /** Every recorded verification attempt in the area and period, with its audit fields. Read-only. */
  getAuditTrail(filters: AuditFilters): Promise<AuditTrail>
}

// The path is provisional until the backend's API is agreed.
const httpAuditApi: AuditApi = {
  getAuditTrail: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/audit-trail', auditTrailSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const auditApi: AuditApi = env.useMocks ? mockAuditApi : httpAuditApi
