import type { ChlFailureKind } from './chl.types.js';

/**
 * A CHL call failed. Callers must map this to an "unavailable" or error
 * state, never to a negative business result.
 */
export class ChlError extends Error {
  constructor(
    readonly kind: ChlFailureKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ChlError';
  }
}
