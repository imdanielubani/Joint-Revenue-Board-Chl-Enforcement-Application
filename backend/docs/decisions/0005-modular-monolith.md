# ADR-0005: Start as a modular monolith

- **Status:** proposed
- **Approval:** awaiting review. `CLAUDE.md` §3 and the Phase 2 instructions
  both prefer this, unless requirements justify otherwise.

## Context

ITEIME spans about 25 candidate domains
([component-boundaries.md](../architecture/component-boundaries.md)) and serves
three clients. No source states a scaling, isolation or deployment constraint
that requires independent services. Most domains are thin or blocked on
decisions, so their boundaries will move as answers arrive.

## Decision

One deployable Express application on one PostgreSQL database, organized as
modules with enforced boundaries:

- A module calls another module only through its service, never through its
  repository or tables.
- Each module owns its tables. `monitoring` owns none.
- The API surfaces (mobile, admin, monitoring) are separate route groups with
  separate permission sets, in the same process.

## Alternatives

- **One microservice per domain.** Independent scaling and deployment, but at
  the cost of distributed transactions, more infrastructure, and boundaries
  drawn too early. Rejected for now.
- **One service per client (mobile, admin, monitoring).** Duplicates domain
  logic. Rejected; route groups and authorization give the separation instead.

## Consequences

- Deployment is simple, and transactions can span domains atomically (for
  example, a case transition together with its audit event).
- Module discipline must be enforced by review, and later by lint rules on
  import paths.
- A module can be extracted later if real load or isolation needs appear.
  Real-time T14 is the most likely candidate.
