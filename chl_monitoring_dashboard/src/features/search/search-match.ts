/** Fewer characters than this match too much to be useful, so nothing is searched. */
export const MIN_QUERY_LENGTH = 2

/**
 * A plate, reference or name as the search compares it: upper case, without
 * spaces, dashes, dots or slashes, so "kja 482xy" finds KJA-482-XY and
 * "vio30280" finds VIO-30280.
 */
export function normalizeQuery(text: string): string {
  return text.toUpperCase().replace(/[\s\-./]+/g, '')
}

/** Whether a query is long enough to search. */
export function isSearchable(query: string): boolean {
  return normalizeQuery(query).length >= MIN_QUERY_LENGTH
}

/** Whether any of the values contains the query, compared as above. Empty values never match. */
export function matchesQuery(query: string, ...values: readonly (string | null | undefined)[]) {
  const wanted = normalizeQuery(query)
  if (wanted.length < MIN_QUERY_LENGTH) return false
  return values.some((value) => !!value && normalizeQuery(value).includes(wanted))
}
