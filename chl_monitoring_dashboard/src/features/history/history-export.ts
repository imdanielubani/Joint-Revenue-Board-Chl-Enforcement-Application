import { actionStatusLabel, methodLabel, outcomeLabel } from '@/features/overview/overview-display'
import {
  actionPill,
  attemptPill,
  pendingActions,
} from '@/features/verifications/verifications-display'
import type { VerificationEntry } from '@/features/verifications/verifications.schemas'
import { formatDateTime } from '@/shared/lib/format'
import { paymentStatusText } from './history-display'

/** The verification history as CSV rows, a header row first. */
export function historyCsvRows(records: readonly VerificationEntry[]): (string | number)[][] {
  return [
    [
      'Reference',
      'Date and time (WAT)',
      'Agent ID',
      'Agent name',
      'Vehicle plate',
      'Vehicle ID',
      'Verification method',
      'Verification result',
      'Completion status',
      'Action taken',
      'Violation reference',
      'Violation category',
      'Case status',
      'Payment request',
      'Payment status',
      'Pending actions',
      'Enforcement point',
    ],
    ...records.map((record) => [
      record.reference,
      formatDateTime(record.recordedAt),
      record.agent.id,
      record.agent.name,
      record.plate,
      record.vehicle.id ?? 'Not resolved by CHL',
      record.method ? methodLabel(record.method) : 'Not supplied',
      record.result ? outcomeLabel(record.result) : 'Not supplied',
      attemptPill(record.attempt).label,
      actionPill(record.actionTaken).label,
      record.violation?.id ?? 'None',
      record.violation?.category ?? 'None',
      record.violation ? actionStatusLabel(record.violation.status) : 'None',
      record.payment?.id ?? 'None',
      record.payment ? paymentStatusText(record.payment) : 'None',
      pendingActions(record).join(' · ') || 'None',
      record.location.area
        ? `${record.location.area} / ${record.location.name}`
        : record.location.name,
    ]),
  ]
}
