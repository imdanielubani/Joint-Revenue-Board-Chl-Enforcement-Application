# ADR-0004: `backend/` is the only ITEIME backend

- **Status:** accepted
- **Approval:** confirmed by the project owner on 14 Oct 2026: `backend/` is
  the only backend and the main backend. Also evidenced by the owner's commit
  `d3f5652`, which removed `iteime_backend/`.
- **Supersedes:** the "two backends" consequence of
  [ADR-0001](0001-fresh-foundation-in-backend.md).

## Context

ADR-0001 built `backend/` next to the working `iteime_backend/` and left
consolidation open. Commit `d3f5652` then deleted `iteime_backend/`; its last
state is at commit `d654c84`. The Flutter app still calls the `/api/v1`
contract that `iteime_backend` served, and `backend/` doesn't implement it yet.

## Decision

Treat `backend/` as the single ITEIME backend. Use `iteime_backend` (from git
history, `d654c84`) only as a **reference** for behaviour already agreed with
the app. Its CHL calls were built against a request (REQ), not a CHL contract,
so they carry no authority.

## Alternatives

- **Restore `iteime_backend/` and drop `backend/`.** Contradicts the owner's
  deletion.
- **Port the `iteime_backend` code wholesale.** Not proposed. Its schema
  predates the Phase 2 ownership review, and it uses raw SQL rather than
  Prisma ([ADR-0002](0002-prisma-with-pg-adapter.md)).

## Consequences

- The mobile app has no working backend in this repository until the mobile
  API is rebuilt in `backend/` (Phase 3/4; Q-REP-7).
- The root `README.md` still points to `iteime_backend/`; its owner needs to
  update it.
