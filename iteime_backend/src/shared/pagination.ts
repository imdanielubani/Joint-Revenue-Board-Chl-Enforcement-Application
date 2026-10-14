import { AppError } from './errors.js';

/** Keyset paging position: the last item's time and ID, newest first. */
export interface Cursor {
  createdAt: Date;
  id: string;
}

/** A page of [items] and the cursor for the next one (null at the end). */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

/** Cursors are opaque to the app. */
export function encodeCursor(item: Cursor): string {
  return Buffer.from(`${item.createdAt.toISOString()}|${item.id}`).toString('base64url');
}

/** The position in [cursor]; throws 400 when it was tampered with. */
export function decodeCursor(cursor?: string): Cursor | undefined {
  if (!cursor) return undefined;
  const [time, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const createdAt = new Date(time ?? '');
  if (!id || !isUuid(id) || Number.isNaN(createdAt.getTime())) {
    throw new AppError(400, 'INVALID_CURSOR', 'The page cursor is not valid.');
  }
  return { createdAt, id };
}

/**
 * Turns rows fetched with `limit + 1` into a page of [limit], mapped by
 * [view]: the extra row only tells whether there is a next page.
 */
export function toPage<R extends Cursor, T>(
  rows: R[],
  limit: number,
  view: (row: R) => T,
): Page<T> {
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(view),
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  };
}
