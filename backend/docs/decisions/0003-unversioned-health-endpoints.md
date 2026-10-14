# ADR-0003: Unversioned liveness and readiness endpoints

**Status:** accepted (14 Oct 2026)

## Context

Load balancers and orchestrators need stable probe URLs that don't change with
API versions. Restarting a healthy process because a dependency is down makes
outages worse.

## Decision

- `GET /health/live` only reports that the process serves HTTP; it checks no
  dependencies.
- `GET /health/ready` runs every registered dependency check, each with a
  2-second timeout. It answers 200 only if all are `up`, and 503 otherwise.
  `not_configured` (for example, no `DATABASE_URL` in development) counts as
  not ready, so the response is never misleading.
- Both are outside `/api/v1`, exempt from rate limiting, and not logged when
  they succeed.
- Failure reasons are logged, never returned to the caller.
- CHL is not part of readiness until CHL documents a health endpoint
  (Q-CHL-8).

## Consequences

A deployment without a database is alive but not ready, which is accurate.
