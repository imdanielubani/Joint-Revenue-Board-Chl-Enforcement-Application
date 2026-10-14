# API boundaries

**Phase 2: architecture proposal, awaiting review.** Labels **[C] [R] [P] [Q]**
are explained in [system-context.md](system-context.md#how-to-read-the-labels).

Nothing in this document is an approved contract. Endpoint groups below are
marked **proposed — contract not approved** unless they are implemented. No
CHL endpoint, payload, token format or webhook signature is described here,
because none is known (Q-CHL-1).

## Implemented today

| Method and path     | Behaviour (verified by tests and `docs/api/openapi.yaml`)                                           |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /health/live`  | 200 `{"status":"ok"}`. Checks no dependencies                                                       |
| `GET /health/ready` | 200 `{"status":"ready","checks":{"database":"up"}}`, or 503 with `down` or `not_configured`         |
| `/api/v1/*`         | The router exists, with no routes: every path answers 404 `not_found`, in the standard error format |

Everything else in this document is a proposal.

## Operation routing

Contradiction **X1** (Q-CHL-4) concerns who serves each mobile operation. The
table records what each source says and the proposal. **[R]** marks the
decision recorded in REQ §1.1 (the mobile app never calls CHL directly).

| Operation group                                | SRD says                                                                   | ITEIME says                | Recorded / proposed                                                     | Confirm with     |
| ---------------------------------------------- | -------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------- | ---------------- |
| Sign-in, refresh, logout, forgot password      | Existing CHL authentication service (§5.1); "mobile-specific API" (§31)    | T17.1 "Auth relay to CHL"  | [R] app → ITEIME → CHL                                                  | Q-CHL-2, Q-CHL-4 |
| Verification (RFID, QR, plate, OCR), last trip | "Backend" (§8, §9.4); "JRB CHL Mobile API" (§37)                           | T17.2 "Verification relay" | [R] app → ITEIME → CHL                                                  | Q-CHL-4, Q-CHL-6 |
| Violations, evidence, notes                    | APIs integrate with existing CHL systems for violations and evidence (§31) | T17.3, T17.4               | [P] app → ITEIME; ITEIME forwards to CHL if CHL is the system of record | Q-CHL-7          |
| Demand notice, payment status                  | "Backend calculates" (§23)                                                 | T17.5                      | [P] app → ITEIME → CHL or provider                                      | Q-PAY-1, Q-PAY-2 |
| Offline cache, sync                            | "Synchronization" domain (§31.1)                                           | T17.6                      | [P] app → ITEIME                                                        | Q-SYN-1          |
| Notifications, push                            | "Receive notifications from backend" (§2)                                  | T17.7                      | [P] app → ITEIME; push via a provider                                   | Q-NOT-1          |
| SOS, field reports, loaded/empty               | "Send notifications to backend" (§2)                                       | T17.8                      | [P] app → ITEIME                                                        | —                |
| Fixed-reader events                            | Gateway → backend → app (§9.5)                                             | —                          | Undecided                                                               | Q-CHL-11         |

## Mobile client boundary

- **Purpose:** field enforcement for Enforcement Agents ([C] SRD §4.1). Only
  agents may use the app ([R] REQ §3.1).
- **Authorization:** bearer token. The agent's own records only (history,
  notifications). Verification is never blocked by geographic scope ([C] SRD
  §4.1).
- **Source of truth:** CHL for vehicles, tags, trips and payments ([C]); ITEIME
  for the records it owns ([P], see [data-ownership.md](data-ownership.md)).
- **Error behaviour:**
  - **[C]** A CHL failure or timeout is **verification unavailable**, never
    "no active trip" or "vehicle not found" (SRD §26.2; acceptance criterion
    12). **[P]** The response is 503 with a dedicated code, and the attempt is
    still recorded as not completed.
  - **[C]** Unknown tag ("not part of the JRB CHL architecture"), vehicle not
    found, E-Tag missing and tag-vehicle mismatch are distinct (SRD §13, §15).
  - **[P]** Validation failures return 400 with field details. Expired or
    revoked sessions return 401. Wrong role returns 403. A deactivated account
    gets a distinct code, so the app signs out (SRD §5.3).
- **GPS when unavailable** ([C] GPS is mandatory, SRD §25; behaviour is
  undefined, Q-VER-1):
  - Option A, **recommended for the MVP [P]:** the API requires `location` on
    every verification and rejects requests without it (400). This matches
    "mandatory" and the app's current behaviour, which blocks verification
    without GPS. Gap: an attempt blocked on the device leaves no server audit
    record.
  - Option B: accept the attempt with `location: null` plus a reason
    (`permission_denied`, `no_fix`) and flag it; this keeps the audit trail
    complete.
  - Under either option the server never fabricates or defaults coordinates.
    Accuracy is stored as reported, and the minimum accuracy is open (Q-VER-1).
- **Dependencies:** `auth`, `verification`, `field-operations`, `violations`,
  `evidence`, `payments`, `synchronization`, `notifications`.

### The existing client contract (APP)

The Flutter app already calls these paths, relative to `/api/v1`
(`jbr_chl_enforcement/lib/core/constants/api_endpoints.dart`; example responses
in `jbr_chl_enforcement/test/fixtures/api/`). They were served by the deleted
`iteime_backend` and are **not implemented in `backend/`**. Whether to keep
them is Q-REP-7 ([ADR-0009](../decisions/0009-api-conventions-and-mobile-contract.md)).

| Method and path (APP)                                                                 | Purpose                                      | Domain             |
| ------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------ |
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`          | Session                                      | `auth`             |
| `GET /dashboard`                                                                      | Daily totals, five most recent verifications | `field-operations` |
| `POST /verifications`, `GET /verifications`, `GET /verifications/{id}`                | Verify; history; detail                      | `verification`     |
| `POST /verifications/{id}/trip/refresh`                                               | Refresh trip status                          | `verification`     |
| `POST /verifications/{id}/destination-location`                                       | Agent GPS for destination detection          | `field-operations` |
| `POST /verifications/{id}/load-status`                                                | Loaded/empty                                 | `field-operations` |
| `POST /rfid/resolve-tags`                                                             | Several tags → plates                        | `verification`     |
| `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` | Inbox                                        | `notifications`    |

### Mobile endpoint groups still to design (proposed — contract not approved)

| Group                                       | Purpose (source)                                              | Notes                                                     |
| ------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `/violations`                               | Create, read own, status (SRD §20–22; T17.3)                  | `Idempotency-Key` required; evidence references required  |
| `/evidence/uploads`                         | Resumable evidence upload (SRD §24; T17.4)                    | Protocol open (Q-VER-4)                                   |
| `/demand-notices`, `/payments/{ref}/status` | Demand notice; live status (SRD §23; T17.5)                   | Status comes only from the authoritative source (Q-PAY-2) |
| `/sync/cache`, `/sync/actions`              | Offline cache download; queued-action upload (SRD §26; T17.6) | Per-item results (Q-SYN-2)                                |
| `/field-reports`, `/sos`                    | Field reports and SOS (SRD §2; T17.8)                         | Payloads undefined                                        |
| `/devices/push-token`                       | Push registration (SRD §29; T17.7)                            | Provider open (Q-NOT-1)                                   |
| `/me`                                       | Profile and scope (REQ A5)                                    | Read only                                                 |

## ITEIME Admin Dashboard boundary

- **Purpose:** ITEIME's operational workflows ([C] ITEIME T1–T15).
- **Authorization:** role and scope per action. Central Enforcement is
  national; State IRS is limited to its state and assigned cases (Q-ROL-1,
  Q-ROL-8). The Legal and Finance actions are restricted.
- **Source of truth:** ITEIME for cases, actors, assignments, legal and
  finance. CHL data (tags, payments) comes only server-side, through the CHL
  adapter ([P], Q-CHL-15).
- **Error behaviour:** invalid case transitions return 409
  `INVALID_TRANSITION` [P]; stale updates return 409 (optimistic concurrency
  with a version) [P]; validation failures return 400.
- **Dependencies:** `cases`, `actors`, `assignments`, `tags`, `intelligence`,
  `suspect-register`, `legal`, `financial-adjustments`, `notifications`,
  `admin-config`, `communications`.

**Proposed — contract not approved:** `/admin/cases` (intake, list, detail,
transitions, children, notes); `/admin/cases/{id}/actors`; `/admin/assignments`;
`/admin/tags/issues`; `/admin/intelligence/*` (read);
`/admin/suspect-register` (read); `/admin/legal/*`;
`/admin/financial-adjustments` (no approval endpoint until Q-PAY-4 is
answered); `/admin/config/*`; `/admin/conversations` (deferred, Q-NOT-2).

## Monitoring Dashboard boundary

- **Purpose:** read-only monitoring ([C] MON).
- **Authorization:** role plus geographic scope on **every** query ([C] MON
  §1, §4). Complete audit access for administrators only; supervisors limited
  by permissions ([C] MON §12.4).
- **Permitted operations:** **GET only** [C]. No close, cancel, upload, edit,
  invoice, refund or configuration ([C] MON §8, §9, §10, "Features not to
  add"). The monitoring routes must not reuse Admin or mobile write routes.
- **Source of truth:** undecided (X2, Q-CHL-5). [P] ITEIME read endpoints over
  the ITEIME records, with trip and payment details fetched through the CHL
  adapter, so authorization and scope filtering happen in one place
  ([ADR-0008](../decisions/0008-monitoring-read-models.md)).
- **Error behaviour:** every response carries a "last updated" or "fetched at"
  time ([P], MON §13). If CHL is unavailable, return the ITEIME data with that
  part marked unavailable, never empty or zero.
- **Critical rules [C]:** GPS captured at an event is never shown as a live
  location (MON §3). A last-reported device state is never shown as current
  (MON §13). Raw RFID is not shown in general views (MON §6). Trip validity is
  not computed locally (MON §7). "Active-trip verification results" counts
  outcomes, not unique trips (MON §2.1).

**Proposed — contract not approved:** `/monitoring/overview`,
`/monitoring/activity`, `/monitoring/verifications`, `/monitoring/trips`,
`/monitoring/violations`, `/monitoring/evidence`, `/monitoring/payments`,
`/monitoring/alerts`, `/monitoring/field-reports`, `/monitoring/agents`,
`/monitoring/audit`, `/monitoring/sync`. All are GET, scoped and paginated.

## CHL adapter boundary (outbound)

- **Purpose:** every ITEIME → CHL call ([ADR-0006](../decisions/0006-chl-integration-boundary.md)).
- **Permitted operations:** only those in a confirmed CHL contract. Today:
  **none**. REQ lists the _requested_ capabilities (A1–A6, V1–V6, T1–T3,
  D1–D3, L1, E1–E2, R1–R4, O1–O3); these are names chosen by the requester,
  not CHL endpoints.
- **Authorization:** server-to-server credentials (Q-CHL-2), plus the agent's
  context where CHL requires it.
- **Error behaviour [P]:** timeout → `unavailable`; 5xx → `unavailable`;
  401/403 → `unauthorized`; a malformed response → `invalid_response`. CHL's
  "not found" or "unknown tag" become domain results **only** when the CHL
  contract defines them as such (G8 in REQ). Retries only for idempotent calls,
  bounded, with backoff.
- **Inbound events (webhooks) [P]:** only once CHL documents them (REQ G13).
  Then: signature verification, replay protection, idempotent handling.

## External services (proposed interfaces only)

| Service                 | Status        | Interface (proposed)                                                                   | Questions |
| ----------------------- | ------------- | -------------------------------------------------------------------------------------- | --------- |
| Payment providers       | Not confirmed | None in ITEIME unless Q-PAY-2 says ITEIME receives payment webhooks                    | Q-PAY-2   |
| SMS, email, push        | Not chosen    | A `NotificationChannel` port, with one adapter per channel; delivery attempts recorded | Q-NOT-1   |
| Evidence storage        | Not chosen    | An `EvidenceStore` port: put, get a signed URL, checksum                               | Q-VER-4   |
| Telephony (call intake) | Not stated    | None; call logs are entered by hand until Q-CAS-11 is answered                         | Q-CAS-11  |

## OpenAPI alignment

`docs/api/openapi.yaml` lists only `GET /health/live` and `GET /health/ready`.
That matches the implemented routes (checked by
`tests/contract/openapi.test.ts`). Every endpoint group in this document is a
proposal and is deliberately **not** in the OpenAPI file.
