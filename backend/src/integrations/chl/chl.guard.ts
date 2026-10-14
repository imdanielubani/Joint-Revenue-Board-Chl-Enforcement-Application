import { ChlError } from './chl.client.js';
import {
  chlAccountSchema,
  credentialCheckSchema,
  type ChlAccount,
  type ChlIdentityClient,
  type CredentialCheck,
} from './chl.identity.js';

import { z, type ZodType } from 'zod';

import type { Logger } from 'pino';

export interface GuardOptions {
  timeoutMs: number;
  logger: Logger;
}

/**
 * Wraps an identity client with the boundary rules of ADR-0006:
 * - every call has a timeout (`timeout`);
 * - anything thrown that isn't a ChlError becomes `unavailable`;
 * - every answer is validated, and a malformed one becomes `invalid_response`;
 * - no retries: no CHL operation is confirmed idempotent yet (Q-CHL-9).
 *
 * Logs name the operation and the failure kind only, never emails,
 * passwords, tokens or CHL's raw response.
 */
export function guardIdentityClient(
  inner: ChlIdentityClient,
  { timeoutMs, logger }: GuardOptions,
): ChlIdentityClient {
  async function call<T>(
    operation: string,
    run: () => Promise<unknown>,
    schema: ZodType<T>,
  ): Promise<T> {
    const started = Date.now();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new ChlError('timeout', `CHL ${operation} timed out after ${timeoutMs} ms`)),
        timeoutMs,
      );
    });
    try {
      const answer = await Promise.race([run(), timeout]);
      const parsed = schema.safeParse(answer);
      if (!parsed.success) {
        throw new ChlError('invalid_response', `CHL ${operation} returned an unexpected answer`);
      }
      return parsed.data;
    } catch (err) {
      const chlError =
        err instanceof ChlError
          ? err
          : new ChlError('unavailable', `CHL ${operation} failed`, { cause: err });
      logger.warn(
        { chl: { operation, kind: chlError.kind, durationMs: Date.now() - started } },
        'CHL call failed',
      );
      throw chlError;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    kind: inner.kind,
    verifyCredentials: (email, password): Promise<CredentialCheck> =>
      call(
        'verifyCredentials',
        () => inner.verifyCredentials(email, password),
        credentialCheckSchema,
      ),
    getAccount: (accountId): Promise<ChlAccount | null> =>
      call('getAccount', () => inner.getAccount(accountId), chlAccountSchema.nullable()),
    requestPasswordReset: async (email): Promise<void> => {
      await call(
        'requestPasswordReset',
        async () => {
          await inner.requestPasswordReset(email);
          return null;
        },
        z.null(),
      );
    },
  };
}
