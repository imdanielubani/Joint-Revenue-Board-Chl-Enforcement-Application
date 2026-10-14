# ADR-0006: The CHL integration boundary

- **Status:** accepted
- **Approval:** approved by the project owner on 14 Oct 2026 (before Phase 3). The CHL contract itself is still awaited (Q-CHL-1, Q-CHL-2).

## Context

CHL is authoritative for identity, vehicles, tags, trips and payments ([C] SRD
§3.2). No CHL API contract is available; REQ is only a request. The SRD
requires that CHL failures are never shown as negative results (§26.2, §33.2;
acceptance criterion 12). Contradiction X1, about who hosts the mobile API, is
unresolved.

## Decision

1. All traffic from ITEIME to CHL goes through `src/integrations/chl`. No other
   module calls CHL over HTTP.
2. The adapter exposes **ITEIME-shaped** operations. Each operation is added
   only when a confirmed contract defines it. Wire formats never leave the
   adapter.
3. Failures are mapped in one fixed way:
   - timeout, network error or 5xx → `unavailable`
   - 401 or 403 → `unauthorized`
   - malformed or unexpected body → `invalid_response`
   - no configuration → `not_configured`

   A business outcome (such as "not found" or "unknown tag") comes only from a
   documented CHL response.

4. Every call has a timeout (`CHL_TIMEOUT_MS`). Only idempotent calls are
   retried, with a limit on attempts and with backoff. Writes are never retried
   unless CHL supports idempotency keys (Q-CHL-9).
5. A deterministic in-memory test double implements the same interface, for
   tests and local development. Validated configuration makes it impossible to
   enable in production, and its responses are labelled as test data.
6. If CHL offers inbound events, they arrive at a dedicated route, with
   signature verification and idempotent processing.
7. Until Q-CHL-4 is answered, each operation is routed app → ITEIME → CHL,
   following the recorded decision [R]. See
   [api-boundaries.md](../architecture/api-boundaries.md#operation-routing).

## Alternatives

- **The mobile app calls CHL directly for CHL-owned data.** Fewer hops, but two
  authentication flows on the device, no single audit point, and CHL
  credentials closer to the client. Not chosen while the recorded decision
  stands; still possible if CHL hosts the mobile API (SRD §37).
- **A shared database with CHL.** Rejected: `CLAUDE.md` §3 says not to assume
  a shared database.

## Consequences

- There is one place to adapt when the CHL contract arrives or changes.
- Verification availability depends on CHL. "Verification unavailable" is a
  first-class result, not an error to hide.
