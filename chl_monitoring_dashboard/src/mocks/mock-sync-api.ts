import type { SyncApi } from '@/features/sync/sync.api'
import type { Synchronization, SyncFilters } from '@/features/sync/sync.schemas'
import { delay } from './delay'
import { summarizeVerifications } from './mock-verifications-api'

/**
 * The received records for an area, period, agent and organization: the
 * verifications the Verifications page lists, so every view agrees.
 */
export function summarizeSync(filters: SyncFilters, now: number = Date.now()): Synchronization {
  const { latestReceivedAt, records } = summarizeVerifications(filters, now)
  return { latestReceivedAt, records }
}

/** Sample data: from the sample verifications. */
export const mockSyncApi: SyncApi = {
  async getSynchronization(filters) {
    await delay()
    return summarizeSync(filters)
  },
}
