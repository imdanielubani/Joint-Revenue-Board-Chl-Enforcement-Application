import { outcomeLabel } from '@/features/overview/overview-display'
import {
  actionPill,
  attemptPill,
  pendingActions,
} from '@/features/verifications/verifications-display'
import {
  ACTIONS_TAKEN,
  ATTEMPT_STATUSES,
  type VerificationEntry,
} from '@/features/verifications/verifications.schemas'
import type { HistoryRegisterFilters } from './use-history-view'

/** The filter value for attempts CHL supplied no value for. */
export const NOT_SUPPLIED = 'not_supplied'

const notSupplied = { value: NOT_SUPPLIED, label: 'Not supplied' }

/** The register's filters' choices. */
export const FILTER_OPTIONS = {
  completion: [
    ...ATTEMPT_STATUSES.map((value) => ({ value, label: attemptPill(value).label })),
    notSupplied,
  ],
  action: [
    ...ACTIONS_TAKEN.map((value) => ({ value, label: actionPill(value).label })),
    notSupplied,
  ],
  violation: [
    { value: 'linked', label: 'Linked to a violation' },
    { value: 'none', label: 'No violation' },
  ],
  payment: [
    { value: 'pending', label: 'Payment pending' },
    { value: 'received', label: 'Payment received' },
    { value: 'none', label: 'No payment request' },
  ],
  pending: [
    { value: 'yes', label: 'Has pending actions' },
    { value: 'no', label: 'Nothing pending' },
  ],
} as const

/** The attempts the register's filters let through; null lets everything through. */
export function applyHistoryFilters(
  records: readonly VerificationEntry[],
  filters: HistoryRegisterFilters,
): VerificationEntry[] {
  const is = (wanted: string | null, value: string) => wanted === null || wanted === value
  return records.filter(
    (record) =>
      is(filters.completion, record.attempt ?? NOT_SUPPLIED) &&
      is(filters.action, record.actionTaken ?? NOT_SUPPLIED) &&
      is(filters.violation, record.violation ? 'linked' : 'none') &&
      is(filters.payment, record.payment?.status ?? 'none') &&
      is(filters.pending, pendingActions(record).length > 0 ? 'yes' : 'no'),
  )
}

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
