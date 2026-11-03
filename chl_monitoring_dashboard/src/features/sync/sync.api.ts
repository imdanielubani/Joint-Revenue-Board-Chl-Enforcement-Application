import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockSyncApi } from '@/mocks/mock-sync-api'
import { synchronizationSchema, type Synchronization, type SyncFilters } from './sync.schemas'

export interface SyncApi {
  /** The received records in the area and period, with their synchronization. Read-only. */
  getSynchronization(filters: SyncFilters): Promise<Synchronization>
}

// The path is provisional until the backend's API is agreed.
const httpSyncApi: SyncApi = {
  getSynchronization: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/synchronization', synchronizationSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
}

export const syncApi: SyncApi = env.useMocks ? mockSyncApi : httpSyncApi
