import { pendingActions } from '@/features/verifications/verifications-display'
import type { VerificationEntry } from '@/features/verifications/verifications.schemas'

/** What the headline figures count: completion, linked violations, payment requests and pending actions. */
export function historyCounts(records: readonly VerificationEntry[]) {
  return {
    completed: records.filter((record) => record.attempt === 'successful').length,
    notCompleted: records.filter((record) => record.attempt === 'unsuccessful').length,
    violations: records.filter((record) => record.violation).length,
    payments: records.filter((record) => record.payment).length,
    pending: records.filter((record) => pendingActions(record).length > 0).length,
  }
}
