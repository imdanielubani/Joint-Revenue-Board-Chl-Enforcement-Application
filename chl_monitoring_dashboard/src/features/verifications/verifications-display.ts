import {
  actionStatusLabel,
  etagResultLabel,
  humanize,
  outcomeLabel,
} from '@/features/overview/overview-display'
import type {
  EtagResult,
  Open,
  VerificationMethod,
  VerificationOutcome,
} from '@/features/overview/overview.schemas'
import type { StatusTone } from '@/shared/ui/StatusLabel'
import type {
  ActionTaken,
  AttemptStatus,
  Provenance,
  VerificationEntry,
} from './verifications.schemas'

/** A pill: its colour, its label and, where the design gives one, its icon. */
export interface Pill {
  tone: StatusTone
  label: string
  icon?: string
}

const NOT_SUPPLIED: Pill = {
  tone: 'neutral',
  label: 'Not supplied',
  icon: 'verifications/not-supplied.svg',
}

function isKnown<K extends string>(table: Record<K, unknown>, value: string): value is K {
  return Object.hasOwn(table, value)
}

const pillFor = <K extends string>(table: Record<K, Pill>, value: Open<K> | null): Pill =>
  value === null
    ? NOT_SUPPLIED
    : isKnown(table, value)
      ? table[value]
      : { tone: 'neutral', label: humanize(value) }

/* ------------------------------------------------------------ Methods (SRD 6.1) */

/** What each method's record is, in the methods card. */
export const METHOD_NOTES: Record<VerificationMethod, string> = {
  rfid: 'Reader-based verification record',
  qr: 'QR-based verification record',
  manual: 'Plate entered by the agent',
  ocr: 'Plate confirmed after text recognition',
}

/** The design's order: RFID, QR, manual plate, OCR-confirmed. */
export const METHOD_ORDER: readonly VerificationMethod[] = ['rfid', 'qr', 'manual', 'ocr']

export const METHOD_ICONS: Record<VerificationMethod, string> = {
  rfid: 'verifications/method-rfid.svg',
  qr: 'verifications/method-qr.svg',
  manual: 'verifications/method-manual.svg',
  ocr: 'verifications/method-ocr.svg',
}

/* ------------------------------------------------------------ E-Tag results (SRD 6.3) */

const ETAG_PILLS: Record<EtagResult, Pill> = {
  valid: { tone: 'success', label: 'Valid E-Tag', icon: 'verifications/etag-valid.svg' },
  missing: { tone: 'amber', label: 'Missing E-Tag', icon: 'verifications/etag-missing.svg' },
  invalid: {
    tone: 'danger',
    label: 'Invalid / fake E-Tag',
    icon: 'verifications/etag-invalid.svg',
  },
  mismatch: {
    tone: 'danger',
    label: 'Tag-vehicle mismatch',
    icon: 'verifications/etag-invalid.svg',
  },
}

/** The E-Tag result's pill (SRD 6.3); "Not supplied" when CHL gave the verification none. */
export function etagPill(result: Open<EtagResult> | null): Pill {
  if (result === null) return NOT_SUPPLIED
  return isKnown(ETAG_PILLS, result)
    ? ETAG_PILLS[result]
    : { tone: 'neutral', label: etagResultLabel(result) }
}

/* ------------------------------------------------------------ Provenance (SRD 6.1) */

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  live_backend: 'Live backend',
  cached_result: 'Cached result',
  offline_origin: 'Offline-origin',
}

const PROVENANCE_PILLS: Record<Provenance, Pill> = {
  live_backend: { tone: 'success', label: PROVENANCE_LABELS.live_backend },
  cached_result: {
    tone: 'amber',
    label: PROVENANCE_LABELS.cached_result,
    icon: 'verifications/kpi-offline.svg',
  },
  offline_origin: {
    tone: 'info',
    label: PROVENANCE_LABELS.offline_origin,
    icon: 'verifications/source-offline.svg',
  },
}

export const provenancePill = (value: Open<Provenance> | null) => pillFor(PROVENANCE_PILLS, value)

export const provenanceLabel = (value: Open<Provenance>) =>
  isKnown(PROVENANCE_LABELS, value) ? PROVENANCE_LABELS[value] : humanize(value)

/* ------------------------------------------------------------ Synchronization (SRD 6.5, 13) */

/** A record CHL received this long after it was made counts as received late. */
const LATE_AFTER_MS = 10 * 60_000

export const SYNC_STATES = ['synced', 'received_late', 'upload_pending'] as const
export type SyncState = (typeof SYNC_STATES)[number]

export const SYNC_LABELS: Record<SyncState, string> = {
  synced: 'Synced',
  received_late: 'Received late',
  upload_pending: 'Upload pending',
}

const SYNC_PILLS: Record<SyncState, Pill> = {
  synced: { tone: 'success', label: SYNC_LABELS.synced },
  received_late: {
    tone: 'amber',
    label: SYNC_LABELS.received_late,
    icon: 'verifications/sync-late.svg',
  },
  upload_pending: {
    tone: 'warning',
    label: SYNC_LABELS.upload_pending,
    icon: 'verifications/kpi-pending.svg',
  },
}

/**
 * The record's synchronization as stored with it: evidence still uploading,
 * or received, on time or late. Null when CHL supplied no status.
 */
export function syncStateOf(entry: VerificationEntry): Open<SyncState> | null {
  if (entry.syncStatus === null) return null
  if (entry.syncStatus === 'evidence_pending') return 'upload_pending'
  if (entry.syncStatus !== 'synced') return entry.syncStatus
  const late =
    entry.receivedAt !== null &&
    Date.parse(entry.receivedAt) - Date.parse(entry.recordedAt) > LATE_AFTER_MS
  return late ? 'received_late' : 'synced'
}

export const syncStatePill = (state: Open<SyncState> | null) => pillFor(SYNC_PILLS, state)

export const syncPill = (entry: VerificationEntry) => syncStatePill(syncStateOf(entry))

/* ------------------------------------------------------------ Attempt and action (SRD 6.1, 6.5) */

const ATTEMPT_PILLS: Record<AttemptStatus, Pill> = {
  successful: { tone: 'success', label: 'Successful' },
  unsuccessful: { tone: 'danger', label: 'Unsuccessful' },
}

export const attemptPill = (value: Open<AttemptStatus> | null) => pillFor(ATTEMPT_PILLS, value)

const ACTION_PILLS: Record<ActionTaken, Pill> = {
  violation_issued: { tone: 'warning', label: 'Violation issued' },
  no_violation: { tone: 'neutral', label: 'No violation issued' },
}

export const actionPill = (value: Open<ActionTaken> | null) => pillFor(ACTION_PILLS, value)

/** What is still to be done about the verification: the case's open status, evidence still uploading. */
export function pendingActions(entry: VerificationEntry): string[] {
  const pending: string[] = []
  const status = entry.violation?.status
  if (status && !['resolved', 'cancelled', 'no_violation'].includes(status)) {
    pending.push(actionStatusLabel(status))
  }
  if (syncStateOf(entry) === 'upload_pending') pending.push('Evidence upload')
  return pending
}

/* ------------------------------------------------------------ Outcomes (SRD 6.4) */

/** The design's order for the outcomes. */
export const OUTCOME_ORDER: readonly VerificationOutcome[] = [
  'active_trip',
  'no_active_trip',
  'etag_missing',
  'invalid_etag',
  'tag_vehicle_mismatch',
  'vehicle_not_found',
  'no_trip_history',
  'verification_unavailable',
  'expired_trip',
]

/* ------------------------------------------------------------ Vehicles (SRD 6.2) */

/** A vehicle seen in the period: its identity and its related records. */
export interface VehicleSummary {
  plate: string
  /** CHL's vehicle ID, where the latest verification resolved the plate. */
  vehicleId: string | null
  type: string | null
  verifications: VerificationEntry[]
  trips: string[]
  violations: { id: string; category: string }[]
  latest: VerificationEntry
}

/** The verifications grouped by plate, most recently seen first. */
export function vehiclesOf(records: readonly VerificationEntry[]): VehicleSummary[] {
  const byPlate = new Map<string, VerificationEntry[]>()
  for (const record of records)
    byPlate.set(record.plate, [...(byPlate.get(record.plate) ?? []), record])
  return [...byPlate].map(([plate, entries]) => {
    // Records arrive newest first: the identity is the latest verification's, as CHL resolved it then.
    const latest = entries[0]!
    return {
      plate,
      vehicleId: latest.vehicle.id,
      type: latest.vehicle.type,
      verifications: entries,
      trips: [...new Set(entries.flatMap((entry) => entry.tripId ?? []))],
      violations: entries.flatMap((entry) =>
        entry.violation ? [{ id: entry.violation.id, category: entry.violation.category }] : [],
      ),
      latest,
    }
  })
}

/** "Lagos / Ojota enforcement point". */
export const placeText = (location: { name: string; area: string }) =>
  location.area ? `${location.area} / ${location.name}` : location.name

/** The text the record register's search matches. */
export function searchTextOf(entry: VerificationEntry): string {
  return [
    entry.reference,
    entry.plate,
    entry.agent.name,
    entry.agent.id,
    entry.location.name,
    entry.location.area,
    entry.result ? outcomeLabel(entry.result) : '',
    entry.vehicle.id ?? '',
  ].join(' ')
}
