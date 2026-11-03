import {
  provenancePill,
  syncStateOf,
  syncStatePill,
  SYNC_STATES,
} from '@/features/verifications/verifications-display'
import { PROVENANCES, type VerificationEntry } from '@/features/verifications/verifications.schemas'
import type { SyncRegisterFilters } from './use-sync-view'

/** The filter value for records CHL supplied no value for. */
export const NOT_SUPPLIED = 'not_supplied'

const notSupplied = { value: NOT_SUPPLIED, label: 'Not supplied' }

/** The register's filters' choices, labelled as the Verifications page labels them. */
export const FILTER_OPTIONS = {
  source: [
    ...PROVENANCES.map((value) => ({ value, label: provenancePill(value).label })),
    notSupplied,
  ],
  sync: [
    ...SYNC_STATES.map((value) => ({ value, label: syncStatePill(value).label })),
    notSupplied,
  ],
} as const

/** The records the register's filters let through; null lets everything through. */
export function applySyncFilters(
  records: readonly VerificationEntry[],
  filters: SyncRegisterFilters,
): VerificationEntry[] {
  const is = (wanted: string | null, value: string) => wanted === null || wanted === value
  return records.filter(
    (record) =>
      is(filters.source, record.provenance ?? NOT_SUPPLIED) &&
      is(filters.sync, syncStateOf(record) ?? NOT_SUPPLIED),
  )
}

/** What the headline figures count, from the status stored with each record. */
export function syncCounts(records: readonly VerificationEntry[]) {
  const count = (test: (record: VerificationEntry) => boolean) => records.filter(test).length
  return {
    synced: count((record) => syncStateOf(record) === 'synced'),
    late: count((record) => syncStateOf(record) === 'received_late'),
    uploading: count((record) => syncStateOf(record) === 'upload_pending'),
    offline: count((record) => record.provenance === 'offline_origin'),
  }
}

/** The text the register's search matches. */
export function searchTextOf(record: VerificationEntry): string {
  return [
    record.reference,
    record.plate,
    record.agent.name,
    record.agent.id,
    record.location.name,
    record.location.area,
  ].join(' ')
}
