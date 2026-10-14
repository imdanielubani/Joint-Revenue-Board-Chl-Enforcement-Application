import type { Client, Role, Scope } from '../access-control/access-control.policy.js';

/**
 * Who is signed in, as CHL described them at sign-in or the last refresh.
 * A snapshot for authorization and audit, never an authoritative record:
 * CHL owns identities (ADR-0007).
 */
export interface Principal {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  organization: string | null;
  region: string | null;
  assignment: string | null;
  scope: Scope | null;
}

/** The authenticated caller of a request, set by `authenticate`. */
export interface AuthContext {
  sessionId: string;
  client: Client;
  principal: Principal;
  sessionExpiresAt: Date;
}

/** Request facts recorded with audit events. */
export interface RequestContext {
  requestId: string;
  ip: string | undefined;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware; undefined on public routes. */
      auth?: AuthContext;
    }
  }
}
