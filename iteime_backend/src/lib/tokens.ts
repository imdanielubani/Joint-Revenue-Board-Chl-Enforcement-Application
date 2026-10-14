import { createHash, randomBytes } from 'node:crypto';

/** A new random token (256 bits), safe to put in a header. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The SHA-256 hash a token is stored and looked up by. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A short random reference, e.g. "VRF-2026-7F3A9C1B". */
export function newReference(prefix: string, now: Date): string {
  return `${prefix}-${now.getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}
