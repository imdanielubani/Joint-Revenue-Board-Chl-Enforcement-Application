import { guardIdentityClient } from './chl.guard.js';
import { FakeIdentityClient } from './fake/fake-identity-client.js';
import { UnconfiguredIdentityClient } from './unconfigured-identity-client.js';

import type { ChlIdentityClient } from './chl.identity.js';
import type { Config } from '../../config/env.js';
import type { Logger } from 'pino';

export { ChlError } from './chl.client.js';
export type { ChlAccount, ChlIdentityClient, CredentialCheck } from './chl.identity.js';

/**
 * The identity client chosen by configuration, wrapped in the boundary guard.
 * There is no real CHL adapter yet: CHL's contract is not available (Q-CHL-1).
 */
export function createIdentityClient(config: Config, logger: Logger): ChlIdentityClient {
  const inner =
    config.chl.identityProvider === 'fake'
      ? new FakeIdentityClient()
      : new UnconfiguredIdentityClient();
  return guardIdentityClient(inner, { timeoutMs: config.chl.timeoutMs, logger });
}
