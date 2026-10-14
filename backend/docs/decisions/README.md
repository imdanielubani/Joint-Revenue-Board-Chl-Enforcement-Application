# Architecture decision records

Short records of decisions that are significant or hard to reverse. An ADR is
numbered and its content is never rewritten. A later ADR supersedes it, and
only the earlier ADR's status line is updated to point at its successor.

Each ADR has: **Status** (proposed, accepted, or superseded by ADR-n),
**Approval** (who approved it, or that approval is awaited), **Context**,
**Decision**, **Alternatives**, **Consequences**.

**Proposed** means recommended in Phase 2 and awaiting the project owner's
review. It does not take effect until it is accepted.

| ADR                                                 | Title                                            | Status                              |
| --------------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| [0001](0001-fresh-foundation-in-backend.md)         | Build the Phase 1 foundation fresh in `backend/` | accepted; partly superseded by 0004 |
| [0002](0002-prisma-with-pg-adapter.md)              | Prisma 7 with the node-postgres driver adapter   | accepted                            |
| [0003](0003-unversioned-health-endpoints.md)        | Unversioned liveness and readiness endpoints     | accepted                            |
| [0004](0004-single-backend.md)                      | `backend/` is the only ITEIME backend            | proposed (confirm)                  |
| [0005](0005-modular-monolith.md)                    | Start as a modular monolith                      | proposed                            |
| [0006](0006-chl-integration-boundary.md)            | The CHL integration boundary                     | proposed                            |
| [0007](0007-chl-data-reference-strategy.md)         | How ITEIME stores references to CHL data         | proposed                            |
| [0008](0008-monitoring-read-models.md)              | Monitoring read models                           | proposed                            |
| [0009](0009-api-conventions-and-mobile-contract.md) | API conventions and the existing mobile contract | proposed (needs Q-REP-7)            |
