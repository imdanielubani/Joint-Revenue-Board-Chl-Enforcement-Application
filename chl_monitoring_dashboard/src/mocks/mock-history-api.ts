import type { HistoryApi } from '@/features/history/history.api'
import type { HistoryFilters, VerificationHistory } from '@/features/history/history.schemas'
import { delay } from './delay'
import { summarizeVerifications } from './mock-verifications-api'

/**
 * The verification history for an area, period, agent and organization: the
 * verifications the Verifications page lists, so every view agrees.
 */
export function summarizeHistory(
  filters: HistoryFilters,
  now: number = Date.now(),
): VerificationHistory {
  const { latestReceivedAt, records } = summarizeVerifications(filters, now)
  return { latestReceivedAt, records }
}

/** Sample data: from the sample verifications. */
export const mockHistoryApi: HistoryApi = {
  async getHistory(filters) {
    await delay()
    return summarizeHistory(filters)
  },
}
