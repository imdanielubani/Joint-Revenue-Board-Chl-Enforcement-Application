# API conventions

Each convention is labelled:

- **Implemented**: in the code and covered by tests.
- **Proposed**: an ITEIME convention awaiting review. It is not an external
  contract.

No CHL contract is described here (Q-CHL-1). Implemented endpoints are listed
in [openapi.yaml](openapi.yaml); a contract test
(`tests/contract/openapi.test.ts`) fails when the spec and the implemented
endpoints differ. Client boundaries are in
[api-boundaries.md](../architecture/api-boundaries.md).

## Paths and versioning

- **Implemented:** business APIs live under `/api/v1`. The router exists but
  has no routes yet. Operational endpoints are unversioned (`GET /health/live`,
  `GET /health/ready`; [ADR-0003](../decisions/0003-unversioned-health-endpoints.md)).
- **Proposed:**
  - Each client surface gets its own prefix: the mobile paths as the app
    already uses them (ADR-0009), `/api/v1/admin/…` and
    `/api/v1/monitoring/…` (GET only).
  - A breaking change means a new version. Additive changes (new optional
    fields, new endpoints) don't.
  - Resources are plural and kebab-case. JSON fields are camelCase.

## Request validation

- **Implemented:** JSON bodies over 100 kB get 413. Malformed JSON gets 400.
  zod validation errors become 400 with `details`.
- **Proposed:** every route validates its params, query and body with a zod
  schema in `<module>.schema.ts`. Unknown fields are rejected on writes.
  External responses (CHL, providers) are validated too, and treated as
  untrusted. Evidence uploads get their own limits (Q-VER-4).

## Errors

**Implemented:** every 4xx and 5xx response has this shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request is invalid.",
    "requestId": "c1c9727c-…",
    "details": [{ "path": "plate", "message": "Required" }]
  }
}
```

- `code` is stable; clients branch on it, never on `message`.
- `message` is safe to show to users. It never contains stack traces, SQL,
  upstream responses, tokens or identifiers.
- `details` is optional.

| Status | Code (implemented)  | When                                          |
| ------ | ------------------- | --------------------------------------------- |
| 400    | `validation_failed` | Input fails schema validation                 |
| 400    | `malformed_json`    | The body is not valid JSON                    |
| 404    | `not_found`         | No such route or resource                     |
| 413    | `payload_too_large` | The JSON body is over 100 kB                  |
| 429    | `rate_limited`      | Over the per-IP rate limit                    |
| 500    | `internal_error`    | Anything unexpected (details are only logged) |

**Proposed** ([ADR-0009](../decisions/0009-api-conventions-and-mobile-contract.md)):

- Change to UPPER_SNAKE_CASE codes, to match the existing mobile app.
- Add 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, a distinct code for deactivated
  accounts, 409 `INVALID_TRANSITION`, 409 `IDEMPOTENCY_CONFLICT`,
  409 `VERSION_CONFLICT`, and 503 for verification unavailable
  (`CHL_UNAVAILABLE`).
- A CHL failure is never reported as a negative business result.

## Pagination and filtering

**Proposed:**

- Cursor-based: `?limit=` (default 20, maximum 100) and `?cursor=` (opaque).
  The response is `{ "items": [...], "nextCursor": "…" | null }`.
- Filters are query parameters named after fields (`?status=escalated`). Date
  ranges use `from` and `to` (ISO 8601).
- Monitoring lists are always paginated and always scope-filtered
  ([ADR-0008](../decisions/0008-monitoring-read-models.md)).

## Timestamps and location context

- **Implemented:** log timestamps are ISO 8601 UTC.
- **Proposed:**
  - API timestamps are ISO 8601 UTC with a `Z` suffix, and are stored as
    `timestamptz`.
  - Records captured on a device carry both `capturedAt` (device time) and
    `receivedAt` (server time).
  - Location is `{latitude, longitude, accuracyMetres, capturedAt}` (WGS84),
    plus `enforcementPointRef` where known. It is never defaulted or invented
    (SRD §25; Q-VER-1).
  - "Daily" figures use the day boundary decided in Q-OPS-4.

## Correlation IDs

**Implemented:** every response has `X-Request-ID`. A caller may send its own
(1–128 characters of `[A-Za-z0-9._:-]`); otherwise one is generated. The ID
appears in logs and in every error body.

**Proposed:** the request ID is also passed to CHL calls (if CHL accepts a
header for it) and stored on audit events.

## Idempotency

**Proposed:** writes that the mobile app may retry from its offline queue
(verifications, violations, notes, evidence, field reports) need an
`Idempotency-Key` header (a client-generated UUID), scoped to the caller.

- The same key with the same body returns the original result.
- The same key with a different body returns 409 `IDEMPOTENCY_CONFLICT`.
- An attempt that failed because CHL was unavailable doesn't keep its key, so
  a retry really retries.
- The retention window is Q-SYN-5.

## Audit events

**Proposed:** services, not controllers, write audit events in the same
transaction as the change they describe.

- **Covered:** every verification attempt, sign-in attempt, status
  transition, denial of access to sensitive data, view of evidence or raw
  identifiers, and financial step.
- **Never recorded:** tokens, passwords or raw RFID values.
- **Fields and integrity:** see the data-model proposal and Q-OPS-2.

## CHL timeouts and failure mapping

**Proposed** ([ADR-0006](../decisions/0006-chl-integration-boundary.md)):

- Every CHL call has a timeout (`CHL_TIMEOUT_MS`, already validated at
  start-up).
- Failures map as follows: timeout, network error or 5xx → `unavailable`;
  401/403 → `unauthorized`; a malformed body → `invalid_response`.
- Only idempotent calls are retried, a limited number of times.

## Authentication and authorization

**Not implemented** (Q-CHL-2, Q-ROL-1). **Proposed:**

- Bearer tokens on every business route.
- Authorization on the server for each action and resource, including
  geographic scope.
- Separate permission sets for mobile, admin and monitoring. Monitoring is
  GET only.
- Hiding things in a client is never treated as access control.

## Limits

**Implemented:** 100 kB JSON bodies; `RATE_LIMIT_PER_MINUTE` per IP (default
300), with `RateLimit` headers (IETF draft 8); health endpoints are exempt.

**Proposed:** stricter per-route limits on sign-in and forgot-password.

## Logging

**Implemented:** one log line per request, with the request ID, method, path
(without the query string), status and duration. Bodies, query strings,
cookies and `Authorization` are never logged. Known sensitive fields are
redacted (`src/config/logger.ts`).

## Contract testing

- **Implemented:** `tests/contract/openapi.test.ts` checks that the OpenAPI
  file documents exactly the implemented endpoints and their status codes.
- **Proposed:**
  - The mobile app's recorded responses (`jbr_chl_enforcement/test/fixtures/api/`)
    become backend contract tests (ADR-0009).
  - CHL adapter tests run against recorded CHL responses once a sandbox exists.
  - The deterministic CHL test double is used for everything else.
