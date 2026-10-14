# ADR-0007: How ITEIME stores references to CHL data

- **Status:** proposed
- **Approval:** awaiting review. Caching needs CHL's agreement (Q-CHL-14).

## Context

ITEIME records (verifications, violations, cases) must point to CHL entities
(agents, vehicles, tags, trips, payments) without becoming a second system of
record ([C] SRD §3.2; `CLAUDE.md` §3). Audit and evidence must show what an
agent saw at the time (SRD §28), even after CHL data changes. Monitoring must
never compute trip validity itself ([C] MON §7).

## Decision

Use the strategies defined in
[data-ownership.md](../architecture/data-ownership.md#persistence-strategies):

- **REF:** store CHL's stable identifier (Q-CHL-13) in a `chl…Id` or
  `…Reference` column, never as a foreign key to a local copy.
- **SNAPSHOT:** for evidence records, store an immutable copy of what was
  shown, with `source` and `fetchedAt`. A snapshot is never presented as the
  current status.
- **CACHE:** only where needed (the offline cache, and the geographic
  hierarchy for scope filters), with an explicit freshness limit and CHL's
  approval.
- No other local copies of agents, vehicles, tags, trips or payments.

## Alternatives

- **Replicate all CHL data.** Faster reads and better offline resilience, but a
  second source of truth that needs reconciling. Rejected without a documented
  requirement.
- **References only, no snapshots.** Loses the evidence of what the agent was
  shown. Rejected.

## Consequences

- Showing current CHL details needs a live CHL call, or an approved cache, and
  views must show the "fetched at" time.
- A plate is a lookup key, not an identity: a plate can move between vehicles.
