# API conventions

Each convention is labelled:

- **Implemented**: in the code and covered by tests.
- **Proposed**: an ITEIME convention for later phases. It is not an external
  contract.

No CHL contract is described here (Q-CHL-1). Implemented endpoints are listed
in [openapi.yaml](openapi.yaml); a contract test
(`tests/contract/openapi.test.ts`) fails when the spec and the implemented
endpoints or error codes differ. Client boundaries are in
[api-boundaries.md](../architecture/api-boundaries.md).

## Paths and versioning

- **Implemented:**
  - Business APIs live under `/api/v1`. Operational endpoints are unversioned
    (`GET /health/live`, `GET /health/ready`;
    [ADR-0003](../decisions/0003-unversioned-health-endpoints.md)).
  - Surfaces: `/api/v1/auth/*` and `/api/v1/me` are shared;
    `/api/v1/monitoring/*` accepts only monitoring sessions and only GET
    (ADR-0008).
- **Proposed:**
  - Mobile routes keep the app's existing paths (ADR-0009), each guarded by
    `requireClient('mobile')`. Admin routes go under `/api/v1/admin/…` once
    their roles are defined (Q-ROL-1).
  - A breaking change means a new version. Additive changes (new optional
    fields, new endpoints) don't.
  - Resources are plural and kebab-case. JSON fields are camelCase.

## Request validation

**Implemented:**

- `validate({ body, query, params })` (`src/shared/middleware/validate.ts`)
  checks every part with a zod schema before the handler runs. Handlers read
  the parsed values with `validated(res, schemas)`.
- Unknown fields are rejected (`.strict()` schemas).
- JSON bodies over 100 kB get 413, and malformed JSON gets 400.
- CHL answers are validated too, and treated as untrusted: a malformed answer
  becomes `invalid_response`.

**Proposed:** evidence uploads get their own limits (Q-VER-4).

## Errors

**Implemented** ([ADR-0009](../decisions/0009-api-conventions-and-mobile-contract.md)):
every 4xx and 5xx response has this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are missing or not valid.",
    "requestId": "c1c9727c-…",
    "details": [{ "field": "email", "message": "Invalid email address" }]
  }
}
```

- `code` comes from one registry (`src/shared/errors/error-codes.ts`), which
  also fixes the HTTP status. Codes are UPPER_SNAKE_CASE, to match the mobile
  app. Clients branch on `code`, never on `message`.
- `message` is safe to show to users. It never contains stack traces, SQL,
  upstream responses, tokens or identifiers.
- `details` is optional; validation errors list `{field, message}`. Query and
  path fields are prefixed (`query.limit`).
- The full list of codes is the `ErrorCode` enum in `openapi.yaml`, checked
  against the registry by the contract test.

| Status | Codes                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`, `MALFORMED_JSON`, `BAD_REQUEST`                               |
| 401    | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `SESSION_EXPIRED`                       |
| 403    | `FORBIDDEN`, `ACCOUNT_DEACTIVATED`, `AGENT_ACCESS_DENIED`, `CLIENT_ACCESS_DENIED` |
| 404    | `NOT_FOUND`                                                                       |
| 405    | `METHOD_NOT_ALLOWED` (writes on the monitoring surface)                           |
| 413    | `PAYLOAD_TOO_LARGE`                                                               |
| 415    | `UNSUPPORTED_ENCODING`                                                            |
| 429    | `RATE_LIMITED`                                                                    |
| 500    | `INTERNAL_ERROR` (details are only logged)                                        |
| 503    | `CHL_UNAVAILABLE`, `CHL_NOT_CONFIGURED`, `SERVICE_UNAVAILABLE`                    |

A CHL failure is never reported as a negative business result. For example,
CHL being down at sign-in is 503 `CHL_UNAVAILABLE`, never 401
`INVALID_CREDENTIALS`.

**Proposed:** 409 `INVALID_TRANSITION`, `IDEMPOTENCY_CONFLICT` and
`VERSION_CONFLICT`, added with the modules that need them.

## Pagination and filtering

**Implemented** (on `GET /api/v1/monitoring/audit-events`; the pattern for
later lists):

- Cursor-based: `?limit=` (default 20, maximum 100) and `?cursor=` (opaque).
  The response is `{ "items": [...], "nextCursor": "…" | null }`.
- Filters are query parameters named after fields (`?outcome=failure`). Date
  ranges use `from` and `to` (ISO 8601).

**Proposed:** monitoring lists are always scope-filtered
([ADR-0008](../decisions/0008-monitoring-read-models.md)). The audit trail
isn't, because the System Administrator has complete access (SRD §28).

## Timestamps and location context

- **Implemented:** API and log timestamps are ISO 8601 UTC with a `Z` suffix,
  and are stored as `timestamptz(3)`.
- **Proposed:**
  - Records captured on a device carry both `capturedAt` (device time) and
    `receivedAt` (server time). The client's time is never treated as
    authoritative.
  - Location is `{latitude, longitude, accuracyMetres, capturedAt}` (WGS84),
    plus `enforcementPointRef` where known. It is never defaulted or invented
    (SRD §25; Q-VER-1).
  - "Daily" figures use the day boundary decided in Q-OPS-4.

## Correlation IDs

**Implemented:**

- Every response has `X-Request-ID`. A caller may send its own (1–128
  characters of `[A-Za-z0-9._:-]`); otherwise one is generated.
- The ID appears in logs, in every error body, and on every audit event.

**Proposed:** pass it to CHL, if CHL accepts a header for it.

## Idempotency

**Blocked** (Q-SYN-2, Q-SYN-5); not implemented in Phase 3, because no
implemented endpoint is retried by the offline queue. Intended design:

- Writes that the app may retry carry an `Idempotency-Key` header, scoped to
  the caller.
- The same key with the same body returns the original result. The same key
  with a different body returns 409 `IDEMPOTENCY_CONFLICT`.
- An attempt that failed because CHL was unavailable doesn't keep its key, so
  a retry really retries.

## Audit events

**Implemented** (`src/modules/audit/`):

- Services write audit events through `AuditService`. Inside a transaction,
  the event is written with the change it describes, so a rolled-back change
  leaves no "success" event.
- **Recorded:** actor (principal with role, anonymous or system), action,
  outcome (success, failure, denied), target, request ID, IP, and redacted
  details.
- **Actions so far:** `auth.login`, `auth.refresh`, `auth.logout`,
  `auth.password_reset.request`, `auth.session.revoke`, `access.denied` and
  `audit.read`.
- **Never recorded:** passwords, tokens, API keys or RFID identifiers.
  Redaction is a safety net; emails are masked (`a***@example.test`).
- **Append-only:** there is no update or delete in the code, and a database
  trigger refuses both. This is not tamper-proof storage (Q-OPS-2).
- The audit trail is separate from the operational logs (pino).

**Proposed:** every verification attempt, status transition, view of evidence
or raw identifiers, and financial step, as those modules are built.

## CHL timeouts and failure mapping

**Implemented** ([ADR-0006](../decisions/0006-chl-integration-boundary.md),
`src/integrations/chl/chl.guard.ts`):

- **Timeout:** every CHL call has one (`CHL_TIMEOUT_MS`).
- **Failure mapping:**
  - no answer in time → `timeout`
  - any other thrown error (network, 5xx) → `unavailable`
  - an answer that doesn't match the expected shape → `invalid_response`
  - no provider configured → `not_configured`
  - `unauthorized` is reserved for CHL refusing ITEIME's own credentials
- **No retries:** no CHL operation is confirmed idempotent yet (Q-CHL-9).
- **Logging:** only the operation name, the failure kind and the duration;
  never emails, passwords, IDs or CHL responses.

## Authentication and authorization

**Implemented** ([ADR-0010](../decisions/0010-iteime-sessions-and-chl-identity-provider.md)):

- Bearer access tokens (opaque, stored as hashes). The identity comes only
  from the server-side session, never from anything the client says about
  itself.
- Separate client surfaces: a mobile session can't use monitoring routes, and
  the reverse.
- Permissions are granted per role, with a cited source; everything else is
  denied by default. Denials are audited.
- The geographic scope check fails closed until CHL defines the hierarchy
  (Q-CHL-10).

**Blocked:** the full permission matrix (Q-ROL-1). The admin surface waits for
its roles.

## Limits

**Implemented:**

- 100 kB JSON bodies.
- `RATE_LIMIT_PER_MINUTE` per IP (default 300), with `RateLimit` headers (IETF
  draft 8); health endpoints are exempt.
- Login and forgot-password: 10 attempts per IP per 15 minutes (an assumption
  to confirm, Q-OPS-6).

## Logging

**Implemented:** one log line per request, with the request ID, method, path
(without the query string), status and duration. Bodies, query strings,
cookies and `Authorization` are never logged. Known sensitive fields are
redacted (`src/config/logger.ts`).

## Contract testing

- **Implemented:** `tests/contract/openapi.test.ts` checks that the OpenAPI
  file documents exactly the implemented endpoints, every error code, and the
  status codes that real requests return.
- **Proposed:**
  - The mobile app's recorded responses (`jbr_chl_enforcement/test/fixtures/api/`)
    become backend contract tests as the mobile routes are built (ADR-0009).
  - CHL adapter tests run against recorded CHL responses once a sandbox exists.
