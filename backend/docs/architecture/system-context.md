# System context

> **Status: proposed.** The diagram below is the intended architecture. Every
> arrow marked `?` waits on the CHL API specification and stakeholder decisions
> ([open questions](../requirements/open-questions.md), section 2).

## Systems

| System                                       | Role                                                                                                                                                                                                                                                                           | Source                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| **Existing JRB CHL platform**                | Authoritative for identity and authentication, vendors, Principal Officers, agents, vehicles, E-Tag/RFID records, QR references, CHL trips, tariffs/levies, payments and transactions.                                                                                         | SRD §1, §3.2, §37         |
| **ITEIME backend** (this project)            | The Enforcement Engine's backend: cases, assignments, actors, investigations, tags workflow, intelligence, legal, financial adjustments, communications and notifications. It also serves the mobile app (to be confirmed, Q-CHL-4). Reaches CHL only through its CHL adapter. | ITEIME T1–T18             |
| **JRB CHL Enforcement mobile app** (Flutter) | Field verification, enforcement, evidence, GPS, offline queue and sync. Lives in `jbr_chl_enforcement/`.                                                                                                                                                                       | SRD                       |
| **ITEIME Admin Dashboard**                   | The operational interface for the Enforcement Engine (T12, T13 and the case workflows).                                                                                                                                                                                        | ITEIME                    |
| **JRB CHL Monitoring Dashboard**             | Read-only monitoring of agents and enforcement (13 modules).                                                                                                                                                                                                                   | MON                       |
| Other systems                                | EDMS, CCA, MVLAs, payment providers, SMS/email/push providers: all undefined.                                                                                                                                                                                                  | SRD §3.1; ITEIME T10, T15 |

## Context diagram (proposed)

```
                 ┌───────────────────────────┐
                 │  JRB CHL Enforcement app  │
                 │  (agents, supervisors)    │
                 └─────────────┬─────────────┘
                               │ HTTPS /api/v1 (Q-CHL-4: all calls, or some direct to CHL?)
                               ▼
┌──────────────────┐   ┌───────────────────────────┐   server-to-server  ┌──────────────────────┐
│ ITEIME Admin     │──►│      ITEIME backend       │────────(?)─────────►│ Existing JRB CHL     │
│ Dashboard        │   │ Express · PostgreSQL      │   CHL adapter       │ platform             │
└──────────────────┘   │ (ITEIME-owned data only)  │◄───────(?)──────────│ (authoritative)      │
                       └─────────────▲─────────────┘   events/webhooks?  └──────────▲───────────┘
                                     │ (?)                                          │ (?)
                               ┌─────┴──────────────────────────────────────────────┴─┐
                               │  JRB CHL Monitoring Dashboard (read-only)            │
                               │  Q-CHL-5: served by CHL, ITEIME, or both?            │
                               └──────────────────────────────────────────────────────┘
```

## Decisions recorded so far (outside this document set)

These were recorded on 14 Oct 2026 while `iteime_backend/` was being built. They
are **not** stated in the three source documents and still need stakeholder
confirmation:

- The mobile app talks only to ITEIME, which relays to CHL. The SRD instead
  names a "JRB CHL Mobile API" (Q-CHL-4).
- The ITEIME Admin Dashboard talks only to ITEIME.
- The Monitoring Dashboard reads from both ITEIME and CHL. The MON document
  describes it as "powered by the existing CHL system" (Q-CHL-5).

## Out of scope for ITEIME

These stay in CHL (SRD §3.2; MON "Features not to add"): account, vendor and
Principal Officer creation; vehicle registration; tag issuance; tariff
configuration; trip-rule configuration and trip creation; role and
geographic-assignment editing.
