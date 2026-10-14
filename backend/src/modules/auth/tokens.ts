import { createHash, randomBytes } from 'node:crypto';

/** An opaque bearer token: 256 random bits, URL-safe. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Tokens are stored only as SHA-256 hashes, so a database leak doesn't leak
 * working tokens. A fast hash is enough: the tokens are random, not passwords.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
