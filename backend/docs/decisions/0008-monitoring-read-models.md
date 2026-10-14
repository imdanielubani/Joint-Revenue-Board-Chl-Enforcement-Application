# ADR-0008: Monitoring read models

- **Status:** proposed
- **Approval:** awaiting review. Depends on Q-CHL-5 (X2).

## Context

The Monitoring Dashboard is read-only, and scoped by role and geography ([C]
MON §1, §4). MON describes its data as coming from CHL; the recorded decision
[R] says it reads both CHL and ITEIME (X2). The same records also feed the
mobile app and the Admin Dashboard.

## Decision

- A `monitoring` module exposes **GET-only** `/api/v1/monitoring/*` endpoints.
  It owns no tables and reads through other modules' services.
- Every query applies the caller's scope on the server. Lists are always
  paginated.
- Trip and payment details come through the CHL adapter and are never computed
  locally. If CHL is unavailable, that part of the response is marked
  unavailable, not returned empty.
- Every response includes `generatedAt`, plus `fetchedAt` for the parts that
  come from CHL.
- No separate read store, materialized views or event pipeline at first. They
  are added only if measured query load requires them.

## Alternatives

- **The dashboard reads everything directly from CHL, as MON describes.**
  Possible if CHL confirms it. But records held by ITEIME (field reports,
  evidence, sync status) would then need a second path, and scope enforcement
  would be split across two systems.
- **A dedicated reporting database or warehouse.** Premature: it adds
  replication and freshness problems.

## Consequences

- There is one authorization point for monitoring data.
- Heavy aggregate queries may need indexes or materialized views later.
