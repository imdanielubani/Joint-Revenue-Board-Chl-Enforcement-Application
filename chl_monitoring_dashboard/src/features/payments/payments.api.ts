import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockPaymentsApi } from '@/mocks/mock-payments-api'
import {
  paymentsMonitoringSchema,
  type PaymentsFilters,
  type PaymentsMonitoring,
} from './payments.schemas'

export interface PaymentsApi {
  /** The demand notices for violations in the area and period, with payment and compliance. Read-only. */
  getMonitoring(filters: PaymentsFilters): Promise<PaymentsMonitoring>
}

// The path is provisional until the backend's API is agreed.
const httpPaymentsApi: PaymentsApi = {
  getMonitoring: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/payments/monitoring', paymentsMonitoringSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const paymentsApi: PaymentsApi = env.useMocks ? mockPaymentsApi : httpPaymentsApi
