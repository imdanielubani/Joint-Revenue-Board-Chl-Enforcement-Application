import { gpsText } from '@/features/geography/record-details'
import { methodLabel, outcomeLabel } from '@/features/overview/overview-display'
import { actionPill, attemptPill, syncPill } from '@/features/verifications/verifications-display'
import { formatDateTime } from '@/shared/lib/format'
import { identifierText, organizationText } from './audit-display'
import type { AuditEntry } from './audit.schemas'

/** The audit trail as CSV rows (SRD 28's audit fields), a header row first. */
export function auditCsvRows(entries: readonly AuditEntry[]): (string | number)[][] {
  return [
    [
      'Reference',
      'Agent ID',
      'Agent name',
      'Vendor / organization',
      'Date and time (WAT)',
      'Verification method',
      'Processed identifier',
      'Vehicle ID',
      'Vehicle plate',
      'Verification result',
      'Attempt status',
      'Trip reference',
      'Violation reference',
      'GPS location',
      'Enforcement point',
      'Location code',
      'Device ID',
      'App version',
      'Action taken',
      'Synchronization status',
      'Received by CHL (WAT)',
    ],
    ...entries.map((entry) => [
      entry.reference,
      entry.agent.id,
      entry.agent.name,
      organizationText(entry),
      formatDateTime(entry.recordedAt),
      entry.method ? methodLabel(entry.method) : 'Not supplied',
      identifierText(entry),
      entry.vehicle.id ?? 'Not resolved by CHL',
      entry.plate,
      entry.result ? outcomeLabel(entry.result) : 'Not supplied',
      attemptPill(entry.attempt).label,
      entry.tripId ?? 'None',
      entry.violation?.id ?? 'None',
      gpsText(entry.position),
      entry.location.area ? `${entry.location.area} / ${entry.location.name}` : entry.location.name,
      entry.location.code,
      entry.device?.id ?? 'Not supplied by CHL',
      entry.device?.appVersion ?? 'Not supplied by CHL',
      actionPill(entry.actionTaken).label,
      syncPill(entry).label,
      entry.receivedAt ? formatDateTime(entry.receivedAt) : 'Not supplied',
    ]),
  ]
}
