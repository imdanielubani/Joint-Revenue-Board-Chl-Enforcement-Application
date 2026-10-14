# Requirements traceability

Maps each major requirement to its source, owning system, the backend module
responsible, its status **in this backend**, and its blockers.

- **Sources:** SRD = `CSNI-DOC-SRD-JRB CHL ENFORCEMENT.pdf`; ITEIME = `_ITEIME Admin Dashboard.docx`;
  MON = `Admin Dashboard.pdf`.
- **Owner:** CHL, ITEIME (this backend), Mobile, Admin (the ITEIME Admin Dashboard), or Monitoring (the JRB CHL Monitoring Dashboard).
- **Status:** not started · designed · implemented · tested · blocked.
- **Modules** are candidates, to be refined in Phase 2. "Prior work" points to
  `iteime_backend/`, which implements part of the mobile API separately (see
  [Q-REP-1](open-questions.md#1-repository-and-source-documents)).

## Platform foundation (this pass)

| Requirement                                     | Source                      | Owner        | Module / API                                      | Status      | Notes                                                                                             |
| ----------------------------------------------- | --------------------------- | ------------ | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| Liveness and readiness reporting                | CLAUDE.md §6                | ITEIME       | `health`: `GET /health/live`, `GET /health/ready` | tested      | Readiness checks only the database ([Q-CHL-8](open-questions.md))                                 |
| Validated configuration, no secrets in errors   | CLAUDE.md §6, §8            | ITEIME       | `config/env.ts`                                   | tested      |                                                                                                   |
| Request IDs, safe structured logs, redaction    | CLAUDE.md §4, §8            | ITEIME       | `shared/middleware`, `config/logger.ts`           | tested      | Bodies and query strings are never logged                                                         |
| Central error format; 404; body and rate limits | CLAUDE.md §8                | ITEIME       | `shared/middleware`, `app.ts`                     | tested      |                                                                                                   |
| CHL adapter boundary                            | SRD §31; ITEIME T18.3       | ITEIME       | `integrations/chl`                                | designed    | Types only; blocked on the CHL API specification ([Q-CHL-1](open-questions.md))                   |
| HTTPS, token authentication, RBAC               | SRD §5.4; ITEIME T18.1      | ITEIME / CHL | `auth`, `access-control`                          | blocked     | [Q-CHL-2](open-questions.md), [Q-ROL-1](open-questions.md)                                        |
| Audit log                                       | SRD §28; ITEIME T18.2, T2.7 | ITEIME       | `audit`                                           | not started | Storage location is [Q-CHL-7](open-questions.md); tamper-evidence is [Q-OPS-2](open-questions.md) |
| Admin configuration (SLA, categories)           | ITEIME T18.4                | ITEIME       | `admin-config`                                    | not started | [Q-CAS-2](open-questions.md), [Q-VER-3](open-questions.md)                                        |

## Mobile application (SRD)

| Requirement                                                            | Source                                   | Owner                        | Module / API                    | Status      | Open question / dependency                                    |
| ---------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- | ------------------------------- | ----------- | ------------------------------------------------------------- |
| Login with CHL credentials, refresh, logout, forgot password           | SRD §5, FR-01–02; ITEIME T17.1           | CHL (identity); ITEIME relay | `auth`                          | blocked     | Q-CHL-2, Q-CHL-4. Prior work: `iteime_backend` (mock CHL)     |
| 24-hour session expiry; immediate denial when deactivated              | SRD §5.3                                 | CHL / ITEIME                 | `auth`                          | blocked     | Q-CHL-3                                                       |
| Verify by RFID reference, QR, plate, OCR-confirmed plate               | SRD §8–12, FR-04–07; ITEIME T17.2        | CHL data; ITEIME relay       | `verification` (candidate)      | blocked     | Q-CHL-6. Prior work: `iteime_backend`                         |
| Plate normalization (ignore spaces/hyphens, case-insensitive)          | SRD §11, FR-06                           | Mobile + ITEIME              | `verification`                  | not started | Prior work: `iteime_backend`                                  |
| Multiple tags: resolve references to plates                            | SRD §9.6                                 | CHL / ITEIME                 | `verification`                  | blocked     | Q-CHL-6                                                       |
| Never expose raw RFID values                                           | SRD §9.4, §34, AC-7                      | ITEIME, Mobile               | `verification`, logging         | designed    | `*.rfidTagId` is redacted in logs; Q-ROL-4                    |
| Distinct outcomes: missing, invalid, mismatch, no trip, unavailable, … | SRD §13, §15, FR-09                      | CHL / ITEIME                 | `integrations/chl` types        | designed    | Outcome vocabulary in `chl.types.ts`                          |
| A network failure is never "No Active Trip"                            | SRD §26.2, §33.2, AC-12                  | ITEIME, Mobile               | `integrations/chl` (`ChlError`) | designed    | Enforced when the verification calls are built                |
| Active trip, last trip, no trip history; no fabrication                | SRD §14–17, FR-08, FR-10                 | CHL (authoritative)          | `verification`                  | blocked     | Q-CHL-1                                                       |
| Valid E-Tag with no trip: enforce only if carrying haulage             | SRD §13.4                                | Mobile + ITEIME              | `violations`                    | not started | Agent confirmation; record in the audit trail                 |
| Violation creation; categories from the backend                        | SRD §19–20, FR-11; ITEIME T17.3          | ITEIME or CHL                | `violations`                    | blocked     | Q-CHL-7, Q-VER-2, Q-VER-3                                     |
| Violation statuses and closure authority                               | SRD §21–22                               | ITEIME / CHL                 | `violations`, `access-control`  | blocked     | Q-ROL-2                                                       |
| Mandatory evidence (photo, GPS, time, agent, plate); camera only       | SRD §24, FR-12, AC-19–21; ITEIME T17.4   | ITEIME                       | `evidence`                      | blocked     | Q-VER-4, Q-VER-5                                              |
| Demand notice (levy + penalty), payment methods                        | SRD §23, FR-13                           | CHL / ITEIME                 | `payments`                      | blocked     | Q-PAY-1                                                       |
| Live payment status; "received" distinct from "trip activated"         | SRD §23.2, FR-14; MON §10                | CHL (truth)                  | `payments`                      | blocked     | Q-PAY-2, Q-PAY-3                                              |
| GPS on every verification                                              | SRD §25, FR-15, AC-18                    | Mobile + ITEIME              | `verification`, `audit`         | blocked     | Q-VER-1                                                       |
| Offline cache download                                                 | SRD §26.1                                | ITEIME                       | `synchronization`               | blocked     | Q-SYN-1                                                       |
| Offline queue upload: idempotent, no duplicate violations              | SRD §26.3, §33.2, FR-16–17; ITEIME T17.6 | ITEIME                       | `synchronization`               | blocked     | Q-SYN-2                                                       |
| Agent dashboard metrics; recent five verifications                     | SRD §7.1, FR-03                          | ITEIME                       | `dashboard` (candidate)         | not started | Q-OPS-4. Prior work: `iteime_backend`                         |
| Supervisor dashboard                                                   | SRD §7.2, §4.3                           | ITEIME / Monitoring          | `monitoring`                    | blocked     | Q-ROL-1, Q-CHL-5                                              |
| Personal history: last 30 days plus view all                           | SRD §27, FR-18                           | ITEIME                       | `verification`                  | not started | Prior work: `iteime_backend`                                  |
| Audit every verification attempt, with the §28 field list              | SRD §28, FR-20, AC-27                    | ITEIME                       | `audit`                         | not started | Q-CHL-7, Q-OPS-2                                              |
| Repeat-vehicle alert after 3 qualifying reports                        | SRD §29, AC-30–31                        | ITEIME                       | `monitoring`, `notifications`   | blocked     | Q-SYN-3                                                       |
| Notifications: retrieve, mark read, push                               | SRD §30, §31.1, FR-19; ITEIME T17.7      | ITEIME                       | `notifications`                 | blocked     | Q-NOT-1 (push provider). Prior work: `iteime_backend` (inbox) |
| SOS, vehicle/driver/situation reports, loaded/empty                    | SRD §2 (17); ITEIME T17.8                | ITEIME                       | `field-operations`              | not started | Payloads are undefined                                        |
| Fixed RFID reader gateway                                              | SRD §9.5                                 | Undetermined                 | —                               | blocked     | Q-CHL-11                                                      |
| Data protection (ISO 27001)                                            | SRD FR-21                                | All                          | Cross-cutting                   | blocked     | Q-OPS-1                                                       |

## ITEIME Enforcement Engine (T1–T18)

| Module                                                         | Submodules | Owner                    | Module / API (candidate)              | Status      | Open question / dependency         |
| -------------------------------------------------------------- | ---------- | ------------------------ | ------------------------------------- | ----------- | ---------------------------------- |
| T1 Control Center (call intake, case form, case ID, SMS)       | 1.1–1.5    | ITEIME; Admin UI         | `cases`, `notifications`              | not started | Q-CAS-3, Q-NOT-1                   |
| T2 Case Management Engine (lifecycle, transitions, SLA, audit) | 2.1–2.7    | ITEIME                   | `cases`, `audit`                      | blocked     | Q-CAS-1, Q-CAS-2                   |
| T3 Multi-Actor Accountability                                  | 3.1–3.5    | ITEIME                   | `actors`                              | not started | Q-CAS-5, Q-ROL-1                   |
| T4 Case Classification                                         | 4.1–4.3    | ITEIME                   | `classification`                      | not started | Q-CAS-4                            |
| T5 Linked Case System                                          | 5.1–5.4    | ITEIME                   | `linked-cases` (or within `cases`)    | not started | Q-CAS-1 (child lifecycle)          |
| T6 Tag Management System                                       | 6.1–6.5    | CHL (issuance) / ITEIME  | `tags`                                | blocked     | Q-TAG-1, Q-TAG-2, Q-TAG-3          |
| T7 Intelligence and Pattern Engine                             | 7.1–7.5    | ITEIME                   | `intelligence`                        | not started | Q-CAS-7                            |
| T8 Suspect Register                                            | 8.1–8.3    | ITEIME                   | `suspect-register`                    | not started | Q-OPS-1 (personal data)            |
| T9 Legal Module                                                | 9.1–9.4    | ITEIME                   | `legal`                               | blocked     | Q-ROL-6                            |
| T10 EDMS / AI Case Structuring                                 | 10.1–10.4  | Undetermined             | —                                     | blocked     | Q-CAS-8 (no AI service approved)   |
| T11 Financial Adjustment Engine                                | 11.1–11.6  | ITEIME; Finance          | `financial-adjustments`               | blocked     | Q-PAY-4, Q-PAY-5                   |
| T12 Central Enforcement Dashboard                              | 12.1–12.4  | Admin UI → ITEIME        | `assignments`, `cases`                | not started | Q-CAS-6                            |
| T13 State IRS Dashboard                                        | 13.1–13.4  | Admin UI → ITEIME        | `cases`, `access-control`             | not started | Q-ROL-1                            |
| T14 Communication and Collaboration                            | 14.1–14.6  | ITEIME                   | `communications`                      | blocked     | Q-NOT-2 (real-time infrastructure) |
| T15 Notification Engine                                        | 15.1–15.5  | ITEIME                   | `notifications`                       | blocked     | Q-NOT-1, Q-CAS-9                   |
| T16 Enforcement Field App                                      | 16.1–16.5  | Mobile → ITEIME          | `field-operations`, `synchronization` | not started | Overlaps with T17                  |
| T17 Mobile API                                                 | 17.1–17.9  | ITEIME (to be confirmed) | see the SRD table above               | blocked     | Q-REP-4, Q-CHL-4                   |
| T18 Platform Services                                          | 18.1–18.4  | ITEIME                   | see the foundation table above        | designed    | Q-REP-4                            |

## JRB CHL Monitoring Dashboard (MON, read-only)

All rows: **Owner** is Monitoring UI, read-only. The **Status** is blocked on
Q-CHL-5 (which APIs serve the dashboard) unless noted. No write capability may
be added for this dashboard (MON §8, §10, "Features not to add").

| Requirement                                                    | Source  | Module / API (candidate)         | Further questions |
| -------------------------------------------------------------- | ------- | -------------------------------- | ----------------- |
| Login through CHL; role-based and geographic access            | MON §1  | `auth`, `access-control`         | Q-ROL-3, Q-CHL-10 |
| Summary metrics, enforcement performance, recent activity      | MON §2  | `monitoring`                     | Q-OPS-4           |
| Command and Control Centre feed; SOS; field reports            | MON §3  | `monitoring`, `field-operations` |                   |
| Views by geographic scope (location … national)                | MON §4  | `monitoring`, `access-control`   | Q-CHL-10          |
| Agent and organization monitoring                              | MON §5  | `monitoring`                     | Q-CHL-1           |
| Verification and E-Tag monitoring                              | MON §6  | `monitoring`                     | Q-ROL-4           |
| CHL trip monitoring (no local validity calculation)            | MON §7  | `integrations/chl`               | Q-CHL-1           |
| Violation and case monitoring; closure history                 | MON §8  | `monitoring`                     | Q-CHL-7           |
| Evidence viewer (no upload or edit)                            | MON §9  | `evidence` (read)                | Q-VER-4           |
| Demand notice, payment and compliance monitoring               | MON §10 | `payments` (read)                | Q-PAY-2           |
| Repeat-vehicle and field notifications                         | MON §11 | `notifications`                  | Q-SYN-3, Q-SYN-4  |
| Verification history; complete audit trail (no edit or delete) | MON §12 | `audit`                          | Q-OPS-2, Q-ROL-5  |
| Synchronization and field status (last reported, never "live") | MON §13 | `synchronization`                | Q-SYN-4           |
