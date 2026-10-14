# API conventions

Implemented endpoints are listed in [openapi.yaml](openapi.yaml). A contract
test (`tests/contract/openapi.test.ts`) fails when the spec and the
implemented endpoints differ.

## Paths and versioning

- Business APIs live under `/api/v1`. A breaking change gets a new version.
  Additive changes (new optional fields, new endpoints) do not.
- Operational endpoints are unversioned: `GET /health/live` and `GET /health/ready`.
- Resource names are plural and kebab-case: `/api/v1/linked-cases`.
- JSON fields are camelCase.

## Request IDs

Every response has `X-Request-ID`. A caller may send its own ID (1–128
characters of `[A-Za-z0-9._:-]`); otherwise one is generated. The same ID
appears in logs and in every error body. Mobile clients should send one per
request, to make support easier.

## Errors

Every 4xx and 5xx response has this shape:

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

- `code` is stable and machine-readable; clients branch on `code`, never on `message`.
- `message` is safe to show to users. It never contains stack traces, SQL,
  upstream responses, tokens or identifiers.
- `details` is optional.

| Status | Code                | When                                          |
| ------ | ------------------- | --------------------------------------------- |
| 400    | `validation_failed` | Input fails schema validation                 |
| 400    | `malformed_json`    | The body is not valid JSON                    |
| 404    | `not_found`         | No such route or resource                     |
| 413    | `payload_too_large` | The JSON body is over 100 kB                  |
| 429    | `rate_limited`      | Over the per-IP rate limit                    |
| 500    | `internal_error`    | Anything unexpected (details are only logged) |

Upstream failures, for example CHL being unavailable, will get their own codes
(such as `verification_unavailable`) when those endpoints are built. They must
never be reported as a negative business result.

## Limits

- JSON bodies: 100 kB. Evidence uploads will have separate, documented limits
  (Q-VER-4).
- Rate limit: `RATE_LIMIT_PER_MINUTE` per IP (default 300), with
  `RateLimit` headers (IETF draft 8). Health endpoints are exempt. Per-route
  limits (for example, sign-in) are added with those routes.

## Timestamps, pagination, filtering

- Timestamps are ISO 8601 in UTC with a `Z` suffix (`2026-10-14T04:53:49.441Z`).
  Persisted as `timestamptz`.
- Pagination (when the first list endpoint is built): cursor-based,
  `?limit=` (default 20, max 100) and `?cursor=`; the response has
  `{ "items": [...], "nextCursor": "…" | null }`.
- Filters are query parameters named after fields (`?status=escalated`).
  Date ranges use `from` and `to` (ISO 8601).

## Idempotency (for mobile sync)

Operations that the mobile app may retry from its offline queue (creating
verifications, violations, notes and evidence) will accept an
`Idempotency-Key` header (a client-generated UUID). A repeated key with the
same body returns the original result; a repeated key with a different body
gets `409 idempotency_conflict`. The details are settled when synchronization
is designed (Q-SYN-2).

## Authentication and authorization

Not implemented yet (Q-CHL-2, Q-ROL-1). Every business route will require
server-side authentication and authorization, including geographic scope.
Hiding things in a client is never treated as access control.

## Logging

One log line per request, with the request ID, method, path (without the
query string), status and duration. Bodies, query strings, cookies and
`Authorization` are never logged. Known sensitive fields are redacted
(`src/config/logger.ts`).
