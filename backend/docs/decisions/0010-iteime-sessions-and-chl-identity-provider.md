# ADR-0010: ITEIME-issued sessions and a CHL identity provider interface

- **Status:** accepted
- **Approval:** the session model and the CHL-outage behaviour were chosen by
  the project owner on 14 Oct 2026, before Phase 3. The two numbers marked
  **assumption** below were set during implementation and need confirming.
- **Related:** Q-CHL-2, Q-CHL-3, Q-ROL-3; [ADR-0006](0006-chl-integration-boundary.md).

## Context

SRD §5 requires sign-in with existing CHL credentials, access and refresh
tokens, automatic sign-out after 24 hours, and denial of deactivated
accounts. CHL's API contract is not available, so it is unknown whether CHL
issues tokens, which endpoint checks credentials, or how deactivation is
signalled (Q-CHL-2, Q-CHL-3). The mobile app already expects
`/api/v1/auth/*` with the response shapes recorded in its fixtures
([ADR-0009](0009-api-conventions-and-mobile-contract.md)).

## Decision

1. **CHL confirms identity; ITEIME issues the session.** After CHL accepts the
   credentials, ITEIME creates its own session (`sessions` table) with opaque
   random tokens (256 bits). Only their SHA-256 hashes are stored.
2. **Identity provider interface.** `ChlIdentityClient` (`src/integrations/chl/chl.identity.ts`)
   exposes only the SRD §5 capabilities: verify credentials, get an account,
   start password recovery. These are not CHL endpoints. Two implementations
   exist:
   - `none`: the default; every call fails `not_configured`, and sign-in
     answers 503 `CHL_NOT_CONFIGURED`;
   - `fake`: synthetic accounts for development and tests. Refused when
     `NODE_ENV=production`, and every response carries `X-ITEIME-Fake-CHL: true`.

   The real adapter is added when the contract arrives.

3. **Lifetimes.** A sign-in ends at most 24 hours after it starts, however
   often it is refreshed (SRD §5.3). Access tokens last 30 minutes
   (**assumption**: no source sets this; configurable 5–120 with
   `ACCESS_TOKEN_TTL_MINUTES`).
4. **Refresh.** Single-use refresh tokens. Rotation is a conditional update,
   so of two concurrent refreshes with the same token only one succeeds. Each
   refresh re-reads the account from CHL:
   - active → new tokens, and the profile snapshot is updated;
   - deactivated, missing, or a role no longer allowed for the client → every
     session of that account is revoked, and the answer is 403;
   - **CHL unreachable → 503, session kept** (the project owner's decision on
     Q-CHL-3), so a deactivated account is never extended unchecked.
5. **Clients.** Each session belongs to one client. `mobile` accepts only
   `ENFORCEMENT_AGENT` (recorded decision, REQ §3.1). `monitoring` accepts
   `SUPERVISOR`, `PRINCIPAL_OFFICER` and `SYSTEM_ADMINISTRATOR` (MON §1).
   Monitoring sessions use the same 24-hour limit until Q-ROL-3 is answered.
   An Admin Dashboard client waits for its roles (Q-ROL-1).
6. **Brute-force limit.** 10 attempts per IP per 15 minutes on login and
   forgot-password (**assumption**; the sources set none).
7. **Forgot password** returns 202 whether or not the account exists. Only a
   CHL outage is reported (503).

## Alternatives

- **Pass CHL's own tokens through.** Impossible without the contract. It could
  replace or wrap step 1 later if CHL issues tokens; the interface allows
  either.
- **Signed JWT access tokens.** No database lookup per request, but revocation
  (deactivation, logout) would only take effect at expiry. Rejected: opaque
  tokens are revoked at once.
- **Allow refresh while CHL is down.** Keeps field work going during outages,
  but a deactivated agent could keep access for up to 24 hours. Not chosen by
  the project owner.

## Consequences

- **Deactivation is not yet "immediate" (SRD §5.3).** It takes effect at the
  account's next refresh: within the access-token lifetime, 30 minutes at
  most. Immediate denial needs CHL to push deactivation events (Q-CHL-3).
- Every authenticated request costs one indexed database lookup.
- Agents can't refresh during a CHL outage. The app must treat 503 on refresh
  as "retry later", not "signed out".
