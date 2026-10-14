# Open questions

Unresolved requirements, integration details, contradictions and decisions.
Nothing listed here may be treated as decided in code or design. When an answer
arrives, record it under the question with its source and date, and set the
status to **answered**.

IDs are stable: other documents link to them. Retired questions keep their ID
and say why.

## Sources

| Short name | File (repository root)                       | Nature                                                                                     |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **SRD**    | `CSNI-DOC-SRD-JRB CHL ENFORCEMENT.pdf`       | Primary source. Mobile application SRD, v1.0, 27 Aug 2026; the approval fields are empty   |
| **ITEIME** | `_ITEIME Admin Dashboard.docx`               | Primary source. Enforcement Engine modules T1–T18, derived from a PRD not in the workspace |
| **MON**    | `Admin Dashboard.pdf`                        | Primary source. JRB CHL Monitoring Dashboard, read-only, derived from the SRD              |
| **REQ**    | `CHL BACKEND API REQUIREMENTS.pdf` / `.docx` | Secondary. A **draft request** to the CHL team (14 Oct 2026); not an answer from CHL       |
| **APP**    | `jbr_chl_enforcement/` (Flutter app)         | Existing code. Its `/api/v1` client and recorded responses (`test/fixtures/api/`)          |

## Contradictions recorded, not reconciled

The sources disagree on these points. None of them has been silently resolved;
each links to the question that has to settle it.

| #   | Contradiction                                                                                                                                                                                                                                                         | Question          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| X1  | **Who hosts the mobile API?** SRD §37 names a "JRB CHL Mobile API" integration layer. ITEIME T17 calls it an ITEIME relay to CHL. REQ §1.1 says the app never calls CHL directly.                                                                                     | Q-CHL-4           |
| X2  | **Where does the Monitoring Dashboard get its data?** MON describes data "received by CHL" and the dashboard as "powered by the existing CHL system". A decision recorded on 14 Oct 2026 (REQ §1.1, project memory) says it reads both CHL and ITEIME.                | Q-CHL-5           |
| X3  | **Case lifecycle.** PRD Version 1 has no Intelligence or Tactical stages; Version 2 (used by ITEIME T2.1) has them.                                                                                                                                                   | Q-CAS-1           |
| X4  | **Module count.** ITEIME says "96 submodules"; its list has 88.                                                                                                                                                                                                       | Q-REP-3           |
| X5  | **Violation closure.** SRD §4.4 and §22 let authorized roles close or cancel violations. MON §8 makes the Monitoring Dashboard read-only, and excludes those actions unless its scope is expanded.                                                                    | Q-ROL-2           |
| X6  | **Tag-vehicle mismatch.** It is a breach that leads to a violation (SRD §13.3, Workflow E), but it is not in the initial violation categories (SRD §19). Separately, the result is called "E-Tag Missing" (§13.1, §15) while the category is called "No E-Tag" (§19). | Q-VER-2           |
| X7  | **The Admin Dashboard and CHL data.** REQ §1 says the ITEIME Admin Dashboard "does not connect to the CHL backend". ITEIME T6 (tag status, physical-tag tracking), T11.4 (deduction from IRS remittance) and T15.5 (status query by plate) need CHL or finance data.  | Q-CHL-15          |
| X8  | **Outcome vocabulary.** The app's contract uses `outcome` = `found` / `vehicleNotFound` / `unknownTag` / `unavailable`, plus separate E-Tag and trip statuses. SRD §15 lists nine result states.                                                                      | Q-REP-9           |
| X9  | **Error code style.** The app expects upper-case codes (`CHL_UNAVAILABLE`, `VALIDATION_ERROR`); the Phase 1 backend emits lower-case codes (`validation_failed`).                                                                                                     | Q-REP-7, ADR-0009 |
| X10 | **Where the supervisor view lives.** SRD §3.1 and §7.2 put a supervisor dashboard in the mobile application's scope. MON §2 provides the same metrics in the web Monitoring Dashboard.                                                                                | Q-ROL-9           |

## Decisions needed before Phase 3

Phase 3 (core platform services) can start with test doubles for CHL. These
answers shape it, in priority order:

1. ~~**Q-REP-1 / ADR-0004:** confirm that `backend/` is the canonical ITEIME
   backend.~~ **Answered** on 14 Oct 2026: `backend/` is the only, main
   backend.
2. **Q-REP-7 / ADR-0009:** keep the existing mobile `/api/v1` contract, or let it change?
3. **Q-CHL-2:** does CHL issue agent tokens, or does ITEIME issue its own after
   CHL verifies the credentials? This decides the design of the auth module.
4. **Q-CHL-7:** which system holds the record of verification attempts and violations?
5. **Q-ROL-1:** at least the agent, supervisor and system-administrator
   permissions, to build RBAC against.
6. **Q-OPS-2:** must the audit log be append-only or tamper-evident?
7. Approval of the proposed ADRs 0005–0009.

---

## 1. Repository and source documents

### Q-REP-1: Which backend is canonical? (answered)

- **Answer (project owner, 14 Oct 2026):** `backend/` is the only backend and
  the main backend. Recorded in [ADR-0004](../decisions/0004-single-backend.md).
- **Question:** confirm that `backend/` is the ITEIME backend going forward.
- **Evidence:** commit `d3f5652` ("Backend Project Structure Setup", by the
  repository owner, 14 Oct 2026) deleted `iteime_backend/` and committed
  `backend/CLAUDE.md`. `backend/` is now the only backend in the repository.
  The deleted code is still in history at `d654c84`.
- **Remaining:** whether the mobile contract that `iteime_backend` served must
  be preserved is a separate question (Q-REP-7).

### Q-REP-2: The PRD is not in the workspace

ITEIME is derived from a PRD ("National Enforcement Coordination & Case
Management System", Versions 1 and 2) that is not in the workspace, so T1–T16
can't be checked against it. Can the PRD be added, or confirmed as superseded
by ITEIME?

### Q-REP-3: 96 or 88 submodules?

ITEIME states "18 modules and 96 submodules", but its list sums to 88 (T1 5,
T2 7, T3 5, T4 3, T5 4, T6 5, T7 5, T8 3, T9 4, T10 4, T11 6, T12 4, T13 4,
T14 6, T15 5, T16 5, T17 9, T18 4). Are 8 submodules missing? (X4)

### Q-REP-4: Are T17 and T18 approved scope?

ITEIME marks T17 (Mobile API) and T18 (Platform Services) with "(A)": added by
the document's author, not taken from the PRD.

### Q-REP-5: What can a Principal Officer do?

The SRD's role section skips §4.2. Principal Officers are primary users (cover
page) with closure authority (§22), but no role definition.

### Q-REP-6: Is SRD v1.0 approved?

Its "Approved by" field and approval list are empty.

### Q-REP-7: Keep the existing mobile API contract?

The Flutter app calls an `/api/v1` contract
(`jbr_chl_enforcement/lib/core/constants/api_endpoints.dart`): `/auth/*`,
`/dashboard`, `/verifications/*`, `/rfid/resolve-tags` and `/notifications/*`.
Responses are recorded in `test/fixtures/api/`. The deleted `iteime_backend`
served this contract; `backend/` serves none of it today, so **the app has no
working backend in this repository**. Should Phase 3/4 keep this contract,
including its error codes (X9), or may it change, with matching app changes?
See [ADR-0009](../decisions/0009-api-conventions-and-mobile-contract.md).

### Q-REP-8: Has CHL answered the API request?

REQ is a draft request to the CHL backend team (base URLs, authentication, the
capabilities A1–A6, V1–V6, T1–T3, D1–D3, L1, E1–E2, R1–R4 and O1–O3, and the
test data). No reply is in the workspace. The capability names in REQ are "ours,
for reference only" (REQ §3), so they are not CHL endpoints.

### Q-REP-9: Which verification outcome vocabulary is the contract? (X8)

Is the SRD §15 list of nine result states the API contract? Or is it a
presentation list, derived from separate vehicle, E-Tag and trip fields (as REQ
V6 and the app do)? The data model stores the separate fields and derives the
§15 state; see
[data-model-proposal.md](../architecture/data-model-proposal.md#verification).

## 2. CHL integration and system boundaries

### Q-CHL-1: CHL API access

Base URLs per environment, the API specification (OpenAPI or Postman), sandbox
access, and the technical contact (SRD §31; REQ G1, G2, G14).

### Q-CHL-2: Authentication and tokens

How does ITEIME authenticate to CHL server-to-server (API key, OAuth client
credentials, mTLS; REQ G3)? Does CHL issue agent tokens, or does ITEIME issue
its own after CHL verifies the credentials (REQ §8 Q1)? What are the token
formats and lifetimes? Is the 24-hour session enforced by CHL or by ITEIME
(SRD §5.3; REQ §3.1)?

### Q-CHL-3: Account deactivation

How does CHL signal a deactivated account, so that access is denied at once
(SRD §3.1, §5.3, acceptance criterion 2)? A webhook or event (REQ G13), or a
check on each refresh (REQ A6)? And when CHL can't be reached, should the
session continue or end?

### Q-CHL-4: Who hosts the mobile API? (X1)

The SRD's "JRB CHL Mobile API" (§37), the ITEIME relay (T17), or the decision
recorded in REQ §1.1 (mobile → ITEIME only)? Confirm per operation group:
authentication, verification, payments, evidence, notifications. See
[api-boundaries.md](../architecture/api-boundaries.md#operation-routing).

### Q-CHL-5: What serves the Monitoring Dashboard? (X2)

CHL, ITEIME, or both, and for which data?

### Q-CHL-6: Who computes the verification result?

Does CHL return one combined verification (vehicle, E-Tag and trip), or does
ITEIME combine separate lookups (REQ §8 Q4)? The SRD says "the backend"
resolves vehicles, validates E-Tags and checks trips (§9.4) without naming
which one.

### Q-CHL-7: The system of record for enforcement records

Where are verification attempts, violations, evidence, demand notices and the
audit trail stored: in CHL (SRD §31 lists them under the "existing JRB CHL
systems"), or in ITEIME (T17.3–T17.9)? MON says violations are "received by
CHL". Does CHL want verification audit fields sent to it (REQ §6)?

### Q-CHL-8: A CHL health endpoint

Is there one, for ITEIME's readiness checks and monitoring?

### Q-CHL-9: Idempotency on CHL writes

Which CHL calls are idempotent, and do they accept idempotency keys (REQ G12)?

### Q-CHL-10: The geographic hierarchy

Which CHL API exposes the hierarchy (enforcement location, zone, ward, LGA,
state, region, subregion, national) and the user scope assignments? MON §4
says they "must come from CHL configuration" (REQ R1, R4).

### Q-CHL-11: The fixed-reader gateway

Who owns and hosts the fixed-reader WebSocket gateway (SRD §9.5, §37)?

### Q-CHL-12: Other named integrations

What are CCA and MVLAs, what is exchanged with EDMS and the other systems, and
which of them does ITEIME integrate with (SRD §3.1)?

### Q-CHL-13: Stable identifiers

Which CHL identifiers are stable, unique and never reused: the agent ID
(REQ §5 assumes the form `JRB-AG-0142`), the vehicle ID, the plate (it can
change hands), the transaction reference (numeric), the E-Tag reference, the QR
content, and the RFID tag ID versus the reference number (SRD §9.4; REQ §8 Q2)?
ITEIME records reference CHL entities only by these identifiers.

### Q-CHL-14: Caching, replication and reconciliation

May ITEIME cache or replicate CHL data: the offline cache (SRD §26.1), the
read models for dashboards, or snapshots of what the agent was shown? For how
long, and how is drift reconciled? This concerns personal data and trips in
particular.

### Q-CHL-15: How the Admin Dashboard's modules reach CHL data (X7)

T6, T11.4 and T15.5 need CHL or finance data, but the recorded decision says
the ITEIME Admin Dashboard has no CHL connection. Should these modules use
ITEIME's CHL adapter on the server side, which would keep that decision true
for the dashboard itself?

## 3. Roles, permissions and access

### Q-ROL-1: The permission matrix

Map the roles to permissions. From the SRD: Enforcement Agent, Supervisor,
Principal Officer and System Administrator. From ITEIME: IRS, Police, Legal,
Finance unit, Central Enforcement, State IRS and support agents. From REQ §3.1:
the role names `ENFORCEMENT_AGENT`, `PRINCIPAL_OFFICER`, `SUPERVISOR` and
`SYSTEM_ADMINISTRATOR`, which are assumed and unconfirmed. Are the ITEIME roles
CHL accounts, or ITEIME-only accounts?

### Q-ROL-2: Who may close or cancel a violation? (X5)

Under which conditions may the enforcing agent, Principal Officer, Supervisor
or System Administrator close or cancel a violation, and what does the
automatic close after confirmed payment do (SRD §21–22)?

### Q-ROL-3: Dashboard sign-in

Do dashboard users sign in through CHL (MON §1), and how long do their
sessions last?

### Q-ROL-4: Raw RFID identifiers

Who may see raw RFID identifiers ("privileged audit-identifier exposure needs
explicit authorization", MON §6)?

### Q-ROL-5: Supervisor audit access

What is the supervisor's audit scope ("according to role authorization", SRD
§28; MON §12.4)?

### Q-ROL-6: The Legal module

Is T9 in scope? The PRD calls the Legal team a user "that should be added".

### Q-ROL-7: Where geographic scope applies

SRD §4.1 says an agent's scope must not stop them verifying a vehicle, while
MON §1 and §4 say scope limits the monitoring data a user sees. Confirm which
reads are scope-filtered: agent history (own records only?), supervisor views,
and ITEIME case views.

### Q-ROL-8: Scope for ITEIME users

What is the scope model for ITEIME users: State IRS by state (T13), Central
Enforcement national (T12), cross-state coordination (T12.4)?

### Q-ROL-9: Where does the supervisor view live? (X10)

In the mobile app (SRD §7.2), the Monitoring Dashboard (MON §2), or both?

## 4. Case management (ITEIME)

### Q-CAS-1: Lifecycle version and transitions (X3)

Version 1 or Version 2? What are the valid transitions? The ITEIME list ends
"Closure → Escalation": is Escalation a stage after Closure, or a transition
allowed from any open stage? Is Closure final, and can a case be reopened?

### Q-CAS-2: SLA durations

SLA durations and escalation thresholds per stage and case type (T2.3; an
"open decision" in the PRD).

### Q-CAS-3: Case ID format

Is `JRB/CHL/KEB/001` organization/scheme/state/sequence? Is the sequence per
state, per year, or global? Is it the same as the violation or case reference
in SRD §20 (see Q-VER-8)?

### Q-CAS-4: Violations and cases

Does a mobile violation create an ITEIME case, only an escalation, or nothing?
The case categories (T4.2) and the violation categories (SRD §19) are
different lists.

### Q-CAS-5: Multi-actor escalation

"Auto-escalation when multiple actors exist" (T3.5): what is escalated, to
whom, and when?

### Q-CAS-6: Jurisdiction conflicts

How are jurisdiction conflicts across states resolved (an "open decision";
T10.2, T12.4)?

### Q-CAS-7: Pattern thresholds

What are the thresholds for high-risk zone flagging (T7.3) and repeated-violation
detection (T7.4)?

### Q-CAS-8: EDMS and AI

Is an AI service approved for T10? What is EDMS: an existing system to
integrate with?

### Q-CAS-9: Public status queries

The taxpayer case-status query by phone or plate (T15.5) is a public channel.
How are callers verified, and what may be disclosed?

### Q-CAS-10: Status layers

T2.5 lists status layers (Admin, Intelligence, Tactical). Are these parallel
statuses kept per layer, or the same as the lifecycle stages?

### Q-CAS-11: Call intake

Is call intake (T1.1, T1.4) integrated with a telephony system, or are calls
logged by hand by an operator?

### Q-CAS-12: Case evidence

T2.6 is an "evidence placeholder (future)". Will case evidence reuse the
mobile evidence store (SRD §24)?

### Q-CAS-13: The suspect register and personal data

The suspect register aggregates by "actor description and location" (T8.1),
often about people who haven't been identified. What is the legal basis, and
what retention and access rules apply (see Q-OPS-1)?

## 5. Tags

### Q-TAG-1: Tag lifecycle statuses

The PRD says "Kingsley to assign". The candidates are Active, Damaged and Not
picked up, with the full lifecycle issued → enumerated → dispatched →
delivered → installed → damaged → replaced (T6.1). What are the transitions?

### Q-TAG-2: Who owns tag status?

Tag issuance is a CHL function (SRD §3.2), and REQ E2 asks CHL for
Active/Damaged/Not picked up/Replaced. Does T6 track tag logistics in ITEIME,
or read CHL's tag records?

### Q-TAG-3: Tampering and non-pickup rules

"Unreported damage is flagged as tampering" and "non-pickup is flagged as an
offence" (T6.2–T6.3): what time limits and evidence apply?

## 6. Verification, violations and evidence

### Q-VER-1: GPS unavailable

GPS is mandatory for every verification (SRD §25). When location permission is
denied or there is no fix, should the backend reject, accept a record with
"location unavailable" and a reason, or accept with a flag? What minimum
accuracy is required? The backend must never fabricate coordinates; see
[api-boundaries.md](../architecture/api-boundaries.md#mobile-client-boundary).

### Q-VER-2: Violation categories (X6)

Should tag-vehicle mismatch be a violation category? Are "E-Tag Missing" (the
result) and "No E-Tag" (the category) the same thing?

### Q-VER-3: The source of categories and charges

Are violation categories and charges configured in CHL, or in ITEIME's admin
configuration (T18.4)? SRD §19 says only "retrieved from the backend".

### Q-VER-4: Evidence storage

Storage (object store?), retention, maximum file size and count, accepted
types, the resumable-upload protocol (T17.4), and access rules.

### Q-VER-5: Enforcing camera-only evidence

Is a server-side check expected for camera-only evidence (metadata,
attestation), or is it a client rule only (SRD §24.3)?

### Q-VER-6: Recording "E-Tag Missing"

"E-Tag Missing" is decided by physical inspection (SRD §13.1), and a failed
RFID scan is not proof of a missing tag (SRD §9.7; MON §6). How is the agent's
confirmation recorded and evidenced?

### Q-VER-7: OCR fallback

Is a server-side OCR service expected for the "online or alternative fallback"
(SRD §12.2)?

### Q-VER-8: Violation reference format

What is the format of the "Case/Violation Reference" (SRD §20)? Is it shared
with ITEIME case IDs (Q-CAS-3)?

## 7. Payments and financial adjustments

### Q-PAY-1: Who generates demand notices?

Which system calculates levy plus penalty and generates demand notices: CHL or
ITEIME (SRD §23)?

### Q-PAY-2: The source of payment truth

Which payment providers are used, which system is the source of payment truth,
and how do confirmations arrive (signed webhooks, or polling CHL; REQ O1, G13)?
A client request must never mark a demand as paid.

### Q-PAY-3: Post-payment actions

What triggers trip activation and the tagging process after payment (both CHL
actions), and how does ITEIME learn the outcome (SRD §23; MON §10)?

### Q-PAY-4: Refund approval

Who approves "Payment Under Duress – Verified" and refunds? What are the refund
SLA and the reconciliation process (T11; a PRD open decision)?

### Q-PAY-5: Deductions from IRS remittance

Which system performs "deduction from IRS remittance (enforcement budget only,
not IGR)", and through which interface (T11.4)?

## 8. Offline, synchronization and repeat-vehicle alerts

### Q-SYN-1: Offline cache

What does the offline cache contain, and how fresh must it be ("configurable
by the backend", SRD §26.1)? How long is a cached verification valid?

### Q-SYN-2: Queued actions

What is the format of the idempotency key? How are conflicts resolved (for
example, a violation created offline for a vehicle that has paid since)? Is an
offline verification re-verified on sync (SRD §26.3, §33.2)?

### Q-SYN-3: Repeat-vehicle alerts

What makes a report "qualifying", what counts as "appropriate follow-up", over
what time window, and who receives the alert (SRD §29; MON §11.1)? It is not
"any three scans".

### Q-SYN-4: Device telemetry

Is the app expected to report RFID, internet and GPS status? The dashboards
need it (MON §11.4, §13), but the SRD doesn't guarantee it.

### Q-SYN-5: Old offline actions

What is the oldest offline action the server should accept? (The deleted
backend used 7 days; no source states a limit.) Which time is authoritative:
captured or received?

### Q-SYN-6: Monitoring freshness

How stale may monitoring data be (MON §13 proposes "data freshness" stamps)?

## 9. Notifications and communications

### Q-NOT-1: Providers

SMS, email and push providers (FCM/APNs), device-token registration, delivery
guarantees, retries and sender IDs (SRD §29–30; T1.5, T15).

### Q-NOT-2: Chat and calls

T14 (chat, WebRTC voice, file sharing, encryption) needs real-time
infrastructure. Is it in the first release?

### Q-NOT-3: Escalation alerts

Who receives automatic escalation alerts (T15.4), and on which triggers?

## 10. Privacy, compliance and operations

### Q-OPS-1: Data protection and retention

Data protection "as defined by ISO27001" (SRD FR-21) and Nigerian data
protection law (NDPA): which controls apply? What are the data-residency
requirements and the legal retention periods for audit records, verification
records, evidence and personal data?

### Q-OPS-2: Audit access and integrity

Who may access audit records? Must the audit store be append-only or
tamper-evident (SRD §28; MON §12.4 "no editing or deleting")?

### Q-OPS-3: Operations

Hosting, the deployment topology (one API host for every client, or separate
ones), the observability stack, backups, RPO/RTO and service-level targets.

### Q-OPS-4: Daily metrics and time zone

Timestamps are persisted in UTC. Are "daily" metrics (SRD §7.1) counted in
Africa/Lagos local days? (The deleted backend did; the app's `/dashboard`
fixture uses a 23:00Z–23:00Z window.)

### Q-OPS-5: Node.js version

Which Node.js LTS does the deployment environment support? Prisma 7 needs
22.18 or later; development used Node 24.
