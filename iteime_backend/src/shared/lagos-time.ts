/** WAT (UTC+1), with no daylight saving: the JRB working day. */
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Start (inclusive) and end (exclusive) of the Lagos day containing [now]. */
export function lagosDay(now: Date): { from: Date; to: Date } {
  const local = now.getTime() + LAGOS_OFFSET_MS;
  const start = local - (local % DAY_MS) - LAGOS_OFFSET_MS;
  return { from: new Date(start), to: new Date(start + DAY_MS) };
}
