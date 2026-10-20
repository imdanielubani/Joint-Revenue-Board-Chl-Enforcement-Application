import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockTripsApi } from '@/mocks/mock-trips-api'
import { tripsMonitoringSchema, type TripsFilters, type TripsMonitoring } from './trips.schemas'

export interface TripsApi {
  /** The trips CHL returned in the area and period, the verified vehicles' trip checks and post-payment status. */
  getMonitoring(filters: TripsFilters): Promise<TripsMonitoring>
}

// The path is provisional until the backend's API is agreed.
const httpTripsApi: TripsApi = {
  getMonitoring: ({ scope, range, from, to }) =>
    request('/api/v1/trips/monitoring', tripsMonitoringSchema, {
      query: { scope, range, from, to },
    }),
}

export const tripsApi: TripsApi = env.useMocks ? mockTripsApi : httpTripsApi
