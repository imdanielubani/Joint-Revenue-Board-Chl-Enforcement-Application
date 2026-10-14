import type { ChlFailureKind } from './chl.types.js';

/**
 * A CHL call failed. Callers must map this to a "verification unavailable" /
 * error state, never to a negative business result.
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

/**
 * The only way ITEIME code may reach CHL. Operations are added here once the
 * CHL API specification confirms them (docs/requirements/open-questions.md,
 * Q-CHL-*); each will declare its timeout, retry and idempotency behaviour.
 */
export interface ChlClient {
  /** Whether a CHL base URL is configured. */
  readonly configured: boolean;
}
