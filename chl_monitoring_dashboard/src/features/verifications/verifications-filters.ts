import { syncStateOf, searchTextOf } from './verifications-display'
import type { VerificationEntry } from './verifications.schemas'

/** The filter value for records whose attempt status CHL did not supply. */
export const NOT_SUPPLIED = 'not_supplied'

/**
 * What narrows the record register: the search and each column filter, null
 * for "All". The summary cards set them too.
 */
export interface RegisterFilters {
  query: string
  method: string | null
  outcome: string | null
  provenance: string | null
  etag: string | null
  sync: string | null
  attempt: string | null
}

export const NO_FILTERS: RegisterFilters = {
  query: '',
  method: null,
  outcome: null,
  provenance: null,
  etag: null,
  sync: null,
  attempt: null,
}

/** Whether any filter other than the search narrows the register. */
export const hasColumnFilters = (filters: RegisterFilters) =>
  (['method', 'outcome', 'provenance', 'etag', 'sync', 'attempt'] as const).some(
    (key) => filters[key] !== null,
  )

/** The records the filters let through; every word of the search must match. */
export function applyFilters(
  records: readonly VerificationEntry[],
  filters: RegisterFilters,
): VerificationEntry[] {
  const words = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const is = (wanted: string | null, value: string | null, empty: string) =>
    wanted === null || wanted === (value ?? empty)
  return records.filter(
    (record) =>
      is(filters.method, record.method, '') &&
      is(filters.outcome, record.result, '') &&
      is(filters.provenance, record.provenance, '') &&
      is(filters.etag, record.etag, '') &&
      is(filters.sync, syncStateOf(record), '') &&
      is(filters.attempt, record.attempt, NOT_SUPPLIED) &&
      (words.length === 0 ||
        words.every((word) => searchTextOf(record).toLowerCase().includes(word))),
  )
}
