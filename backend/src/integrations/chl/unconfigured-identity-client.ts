import { ChlError } from './chl.client.js';

import type { ChlIdentityClient } from './chl.identity.js';

const notConfigured = () =>
  Promise.reject(new ChlError('not_configured', 'No CHL identity provider is configured'));

/**
 * Used when no CHL identity provider is configured: the default, and the only
 * choice in production until CHL's contract is available. Every call fails
 * with `not_configured`, so sign-in answers 503 CHL_NOT_CONFIGURED instead of
 * pretending to work.
 */
export class UnconfiguredIdentityClient implements ChlIdentityClient {
  readonly kind = 'none' as const;
  verifyCredentials = notConfigured;
  getAccount = notConfigured;
  requestPasswordReset = notConfigured;
}
