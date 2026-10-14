# Data ownership

The ITEIME database holds **ITEIME-owned records only**. CHL-owned data is
read through the CHL adapter when needed. It is copied into ITEIME only where a
documented decision allows it (for example, an offline cache or snapshots
taken for evidence). Each copy records its source and the time it was fetched.

No Prisma models exist yet. This table is the input to Phase 2.

| Data                                                       | Authoritative owner              | ITEIME holds                                                       | Source                  | Status             |
| ---------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ | ----------------------- | ------------------ |
| User accounts, credentials, roles, deactivation            | CHL                              | Session references only (if ITEIME issues its own tokens: Q-CHL-2) | SRD §5; MON §1          | Q-CHL-2, Q-CHL-3   |
| Vendors, Principal Officers, agents, organizations         | CHL                              | Agent ID as a foreign reference on ITEIME records                  | SRD §3.2                | Confirmed by SRD   |
| Geographic hierarchy and agent scopes                      | CHL configuration                | References; possibly a cache                                       | MON §4                  | Q-CHL-10           |
| Vehicles, plates                                           | CHL                              | Plate/vehicle ID referenced by verification and case records       | SRD §3.2                | Confirmed by SRD   |
| E-Tags, RFID records, QR references                        | CHL                              | Never raw RFID values in general records (SRD §9.4)                | SRD §3.2, §10           | Q-ROL-4            |
| CHL trips and trip status                                  | CHL                              | Trip reference; a snapshot of what the agent was shown             | SRD §14                 | Q-CHL-6            |
| Tariffs, levies, payment and transaction records           | CHL / payment providers          | Payment reference and last known status, refreshed from the source | SRD §23; MON §10        | Q-PAY-1, Q-PAY-2   |
| Verification attempts (audit trail)                        | **To be decided**                | Candidate: ITEIME                                                  | SRD §28, §31            | Q-CHL-7            |
| Violations, evidence metadata, demand notices              | **To be decided**                | Candidate: ITEIME                                                  | SRD §20–24, §31; MON §8 | Q-CHL-7, Q-PAY-1   |
| Evidence files                                             | ITEIME (storage to be decided)   | Behind a storage interface; no provider chosen                     | SRD §24                 | Q-VER-4            |
| Offline sync records and idempotency keys                  | ITEIME                           | Yes                                                                | SRD §26                 | Q-SYN-2            |
| Field reports: SOS, vehicle/driver/situation, loaded/empty | ITEIME                           | Yes                                                                | SRD §2                  | Payloads undefined |
| Notifications and repeat-vehicle alerts                    | ITEIME                           | Yes                                                                | SRD §29–30              | Q-SYN-3, Q-NOT-1   |
| Cases, lifecycle, SLA timers, actors, linked cases         | ITEIME                           | Yes                                                                | ITEIME T1–T5            | Q-CAS-1, Q-CAS-2   |
| Tag logistics workflow (lifecycle statuses)                | ITEIME / CHL (unclear)           | To be decided                                                      | ITEIME T6               | Q-TAG-1, Q-TAG-2   |
| Intelligence aggregates, suspect register                  | ITEIME                           | Yes (personal data: Q-OPS-1)                                       | ITEIME T7–T8            |                    |
| Legal notes and prosecution flags                          | ITEIME                           | Yes                                                                | ITEIME T9               | Q-ROL-6            |
| Financial adjustments, refunds and their audit             | ITEIME (approval: to be decided) | Yes                                                                | ITEIME T11              | Q-PAY-4            |
| Chat and messages                                          | ITEIME                           | Yes                                                                | ITEIME T14              | Q-NOT-2            |
| Audit log of ITEIME actions                                | ITEIME                           | Yes; append-only                                                   | ITEIME T2.7, T18.2      | Q-OPS-2            |

## Rules

- Persist timestamps in UTC (`timestamptz`), and keep location and time-zone context where it matters.
- Never treat a stale copy of CHL data as current. Show when it was fetched.
- Never mark a payment as received because a client said so. The payment
  status comes from the authoritative source only.
