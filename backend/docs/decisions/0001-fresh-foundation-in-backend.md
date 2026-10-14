# ADR-0001: Build the Phase 1 foundation fresh in `backend/`

**Status:** accepted (14 Oct 2026, project owner). Its "two backends"
consequence is superseded by [ADR-0004](0004-single-backend.md):
`iteime_backend/` was removed in commit `d3f5652`.

## Context

The repository already contains `iteime_backend/`, a working ITEIME backend.
It has Express 5, TypeScript, PostgreSQL through raw `pg` with numbered
migrations, a CHL adapter (mock and HTTP skeleton), mobile API v1 and tests.
The mobile app is connected to it. During this pass, it was also being
restructured in a separate working session, with uncommitted changes.

`backend/` was created with the project instructions (`CLAUDE.md`) and an
`npm init` package, and nothing else.

## Decision

Build the Phase 1 foundation in `backend/` from scratch. Do not modify
`iteime_backend/`, and do not port its code in this pass. Refer to
`iteime_backend/` as prior work in the traceability matrix.

## Consequences

- There are two backends until they are consolidated. The mobile app keeps
  using `iteime_backend/`.
- Consolidation (port modules into `backend/`, or retire one) is an open
  decision: [Q-REP-1](../requirements/open-questions.md).
- When mobile modules are built here, `iteime_backend/` is a reference for
  behaviour already agreed with the app (plate normalization, verification
  views, session lifetimes). Its CHL calls follow a _request_ sent to the CHL
  team, not a confirmed CHL contract.
