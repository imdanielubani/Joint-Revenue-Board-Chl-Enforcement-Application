import { outcomeLabel } from '@/features/overview/overview-display'
import { pendingActions } from '@/features/verifications/verifications-display'
import type { VerificationEntry } from '@/features/verifications/verifications.schemas'

/** "Payment pending" or "Payment received", as CHL records the demand notice. */
export const paymentStatusText = (payment: NonNullable<VerificationEntry['payment']>) =>
  payment.status === 'received' ? 'Payment received' : 'Payment pending'

/** The text the history register's search matches. */
export function searchTextOf(record: VerificationEntry): string {
  return [
    record.reference,
    record.plate,
    record.vehicle.id ?? '',
    record.agent.name,
    record.agent.id,
    record.location.name,
    record.location.area,
    record.result ? outcomeLabel(record.result) : '',
    record.tripId ?? '',
    record.violation?.id ?? '',
    record.violation?.category ?? '',
    record.payment?.id ?? '',
  ].join(' ')
}

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
