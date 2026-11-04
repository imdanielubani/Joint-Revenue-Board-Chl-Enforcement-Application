import { lagosDay } from '@/shared/lib/dates'
import type { SearchResults } from './search.schemas'

/**
 * A record's address with the period from its day to today, so the page opens
 * on a period that holds it however long ago it was recorded.
 */
export function withPeriod(path: string, recordedAt: string, today: string = lagosDay()) {
  const from = lagosDay(new Date(recordedAt))
  return `${path}&range=custom&from=${from}&to=${today}`
}

/** The result groups, in the page's order, with their names for one and for many. */
export const RESULT_GROUPS = [
  { key: 'vehicles', one: 'vehicle', many: 'vehicles' },
  { key: 'agents', one: 'agent', many: 'agents' },
  { key: 'verifications', one: 'verification', many: 'verifications' },
  { key: 'violations', one: 'violation', many: 'violations' },
  { key: 'payments', one: 'payment request', many: 'payment requests' },
  { key: 'trips', one: 'trip', many: 'trips' },
] as const

export type ResultGroupKey = (typeof RESULT_GROUPS)[number]['key']

/** How many results the search found in all. */
export const totalResults = (results: SearchResults) =>
  RESULT_GROUPS.reduce((sum, group) => sum + results[group.key].length, 0)

/** "1 vehicle · 3 verifications": what was found, leaving out the groups with nothing. */
export function resultsSummary(results: SearchResults): string {
  return RESULT_GROUPS.flatMap((group) => {
    const count = results[group.key].length
    return count === 0 ? [] : [`${count} ${count === 1 ? group.one : group.many}`]
  }).join(' · ')
}
