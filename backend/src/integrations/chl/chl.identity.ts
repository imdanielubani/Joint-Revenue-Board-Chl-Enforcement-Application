import { z } from 'zod';

import { roles, scopeLevels } from '../../modules/access-control/access-control.policy.js';

/**
 * The CHL identity capabilities ITEIME needs, in ITEIME's own terms.
 *
 * These are the capabilities SRD §5 requires (sign in with existing CHL
 * credentials, the existing password-recovery process, denial of deactivated
 * accounts). They are NOT CHL endpoints: CHL's API contract is not available
 * (Q-CHL-1, Q-CHL-2). A real adapter will implement this interface once the
 * contract is confirmed; until then only `UnconfiguredIdentityClient` and the
 * labelled `FakeIdentityClient` exist.
 */
export interface ChlIdentityClient {
  /** "none" (not configured), "fake" (test double) or, later, the real adapter. */
  readonly kind: 'none' | 'fake';

  /** Checks an email and password with CHL. "invalid" is CHL's own answer. */
  verifyCredentials(email: string, password: string): Promise<CredentialCheck>;

  /** The account as CHL holds it now, or null when CHL says it doesn't exist. */
  getAccount(accountId: string): Promise<ChlAccount | null>;

  /** Starts CHL's password-recovery process (SRD §5.2). */
  requestPasswordReset(email: string): Promise<void>;
}

/** What ITEIME needs to know about a CHL account (REQ A5 lists the fields requested). */
export const chlAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(3),
  // A role ITEIME doesn't recognize arrives as null: it gets no access.
  role: z.enum(roles).nullable(),
  organization: z.string().nullable(),
  region: z.string().nullable(),
  assignment: z.string().nullable(),
  scope: z
    .object({ level: z.enum(scopeLevels), ref: z.string().min(1), name: z.string().min(1) })
    .nullable(),
  status: z.enum(['active', 'deactivated']),
});
export type ChlAccount = z.infer<typeof chlAccountSchema>;

export const credentialCheckSchema = z.discriminatedUnion('result', [
  z.object({ result: z.literal('valid'), account: chlAccountSchema }),
  z.object({ result: z.literal('invalid') }),
]);
export type CredentialCheck = z.infer<typeof credentialCheckSchema>;
