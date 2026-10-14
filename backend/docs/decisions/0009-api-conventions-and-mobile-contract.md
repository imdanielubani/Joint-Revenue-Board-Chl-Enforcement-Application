# ADR-0009: API conventions and the existing mobile contract

- **Status:** proposed; needs a decision on Q-REP-7
- **Approval:** awaiting review.

## Context

Phase 1 set the conventions for `backend/`
([api-conventions.md](../api/api-conventions.md)), including lower-case error
codes such as `validation_failed`.

The existing Flutter app was built against the deleted `iteime_backend`
contract (paths listed in
[api-boundaries.md](../architecture/api-boundaries.md#the-existing-client-contract-app)).
That contract matches Phase 1 almost everywhere:

- paths under `/api/v1`
- camelCase JSON
- ISO 8601 UTC times
- cursor pagination
- `Idempotency-Key`
- the error envelope `{error: {code, message, details, requestId}}`

The one difference is the error codes, which the app expects in upper case
(`CHL_UNAVAILABLE`, `VALIDATION_ERROR`). This is contradiction X9.

## Decision (proposed)

1. **Keep the existing mobile paths and response shapes** as the starting point
   of the mobile API, so the app works again without UI changes. Change them
   only to fix proven defects, each with a matching app change.
2. **Use UPPER_SNAKE_CASE error codes** across the whole API, matching the app.
   In Phase 3 the Phase 1 codes would change as follows, together with the
   OpenAPI file and the tests:

   | Phase 1 code        | New code            |
   | ------------------- | ------------------- |
   | `not_found`         | `NOT_FOUND`         |
   | `validation_failed` | `VALIDATION_ERROR`  |
   | `malformed_json`    | `MALFORMED_JSON`    |
   | `payload_too_large` | `PAYLOAD_TOO_LARGE` |
   | `rate_limited`      | `RATE_LIMITED`      |
   | `internal_error`    | `INTERNAL_ERROR`    |

3. "Verification unavailable" keeps its own 503 code (`CHL_UNAVAILABLE` in the
   app today) and is never folded into a business result.
4. The other conventions stay as documented in `api-conventions.md`.

## Alternatives

- **Keep lower-case codes and change the app.** Consistent with Phase 1, but it
  forces app changes for no user benefit.
- **A different code style per client.** Rejected: every client gets one error
  format.

## Consequences

- Phase 3 needs a small, mechanical change to the error handler, its tests and
  the OpenAPI file.
- The app's recorded responses (`jbr_chl_enforcement/test/fixtures/api/`) become
  contract tests for the backend.
