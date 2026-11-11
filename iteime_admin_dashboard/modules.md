# ITEIME Admin Dashboard – Modules

The modules of the ITEIME Admin Dashboard, taken from
**ITEIME – Developer Specification** (based on PRD V1) in this folder. Nothing
here goes beyond that document; open questions are listed as the document
leaves them.

This folder will hold the dashboard's code. For now the work is the UI design
only; no code is written yet.

## How to read this

- **Has sub-modules** means the specification names the parts inside the
  module. Each part is listed under it.
- **No sub-modules** means the specification names the module only.
- **Where it lives:** most modules are screens in this dashboard. M8 (the Field
  Enforcement App) is the field agents' mobile app
  ([`jbr_chl_enforcement/`](../jbr_chl_enforcement/)); the dashboard shows
  what it records.
- **Addendum:** section 12 of the specification (Field Teams and Agency Head)
  wins wherever it conflicts with earlier sections.

## Summary

| No. | Module | Group | Sub-modules |
|---|---|---|---|
| M1 | Multi-Channel Intake | Intake | Yes |
| M2 | Control Center Console | Intake | Yes |
| M3 | Case Management Engine | Case core | Yes |
| M4 | Routing & Transfer | Case core | Yes |
| M5 | Multi-Actor Accountability | Case core | No |
| M6 | Linked Cases | Case core | Yes |
| M7 | Field Agent Management | Field enforcement | Yes |
| M8 | Field Enforcement App | Field enforcement | Yes (mobile app) |
| M9 | Penalty & Payment Tracker | Field enforcement | Yes |
| M10 | Enforcement Activity Feed | Field enforcement | No |
| M11 | State IRS Dashboard | Dashboards | Yes |
| M12 | Law Enforcement Dashboard | Dashboards | Yes |
| M13 | Central Enforcement Dashboard | Dashboards | Yes |
| M14 | Command & Control Dashboard | Dashboards | Yes |
| M15 | Legal Dashboard | Dashboards | Yes |
| — | Agency Head View | Dashboards (addendum) | Yes |
| M16 | Pattern Engine | Intelligence and money | No |
| M17 | Suspect Register | Intelligence and money | No |
| M18 | Tag Management | Intelligence and money | No |
| M19 | Financial Adjustment (Refunds) | Intelligence and money | No |
| M20 | EDMS | Intelligence and money | No |
| — | Notifications | Shared services | Yes |
| — | Communication | Shared services | Yes |
| — | Access, Audit and Security | Shared services | Yes |

## Intake

### M1 Multi-Channel Intake — has sub-modules

Brings taxpayer grievances from every channel into one queue.

- Call
- SMS
- USSD
- WhatsApp
- Web / app

### M2 Control Center Console — has sub-modules

Where Control Center agents handle the queue.

- **Triage**
- **Create case**: name, phone, plate, location (State, LGA, Area, Bus Stop),
  case type (mandatory), actors, actor description, date/time, reporter type.
  On saving, the system gives the case a unique ID (e.g. `JRB/CHL/KEB/001`),
  saves the call log, starts the SLA timer and sends an SMS confirmation.
- **Route**: send the case to the relevant party, or to several when more than
  one actor is involved.

## Case core

### M3 Case Management Engine — has sub-modules

- **Lifecycle**: Created → Assigned → Investigation → Intelligence → Tactical →
  Resolved → Closed. Only defined transitions are allowed. Escalation is a flag
  that can be applied at any stage (SLA breach, multi-actor rule, or manual
  action), not a final step.
- **SLA**: a timer attaches at creation; a breach escalates the case
  automatically to the Central Enforcement dashboard.
- **Audit**: every transition is recorded with a timestamp.
- **Case notes** (from the API surface: `POST /cases/:id/notes`).

### M4 Routing & Transfer — has sub-modules

- **Assign**
- **Escalate**
- **Transfer**: the sender picks a destination party (and state, where
  relevant) and gives a reason; the system checks the routing permission
  table; the receiver accepts or rejects. Rejected cases return to the sender.
- **Ownership history**: every transfer step is recorded.
- **Routing permissions**: the From / To table of which party may route to
  which, stored as data and editable without a redeploy.

### M5 Multi-Actor Accountability — no sub-modules

A case involving more than one actor is escalated automatically and routed to
every relevant authority. Actor types: IRS, Police, Enforcement Agent,
Civilian/Unknown.

### M6 Linked Cases — has sub-modules

- **Parent case**: shows a summary of its child cases; closes only when all
  of them are closed.
- **Child cases**: each with its own ID and lifecycle.

## Field enforcement

### M7 Field Agent Management — has sub-modules

- **Onboarding**
- **Agency**: State IRS, Law Enforcement or other.
- **Zones**
- **Teams** (addendum): create and edit teams, add or move officers. An
  officer belongs to exactly one team at a time; there is no team lead. Moves
  are audit-logged and keep their history. Managed only by the agency head and
  designated admins.

### M8 Field Enforcement App — has sub-modules (mobile app)

Used by field agents on their phones; the dashboard shows what it records.

- Trip check
- Plate lookup
- Raise penalty
- Evidence (image / video)
- GPS (mandatory on every action; out-of-zone actions are flagged, not
  blocked)
- Escalate
- Transaction validation (addendum)

### M9 Penalty & Payment Tracker — has sub-modules

- **Penalties**: raised, paid, disputed or waived. A disputed penalty creates
  a linked grievance case.
- **Transactions** (addendum): payments synced in from the external payment
  system, linked to their penalty, with a validation status of pending,
  validated or flagged.

### M10 Enforcement Activity Feed — no sub-modules

The live, location-mapped feed of enforcement actions. Penalty status changes
(raised, paid, disputed) appear in real time.

## Dashboards

One dashboard shell, scoped by party and jurisdiction. Each party dashboard
shows its **Cases** and its **Transactions** (trip checks, penalties raised,
penalties paid).

### M11 State IRS Dashboard — has sub-modules

- **Cases**: its state's cases.
- **Transactions**: its own agents' actions.

### M12 Law Enforcement Dashboard — has sub-modules

- **Cases**: cases received for investigation.
- **Transactions**: its own officers' actions.

### M13 Central Enforcement Dashboard — has sub-modules

- **Cases**: escalations, including SLA breaches.
- **Transactions**

Responsibilities otherwise to be confirmed (see Open items).

### M14 Command & Control Dashboard — has sub-modules

- **Cases**: oversight, classification and prioritisation across all parties.
- **Transactions**

Responsibilities otherwise to be confirmed (see Open items).

### M15 Legal Dashboard — has sub-modules

- **Cases**: escalated cases for review.
- **Legal notes**
- **Mark for prosecution**

### Agency Head View (addendum) — has sub-modules

A role-scoped view of the same data for the head of an agency (for example a
State IRS or a Law Enforcement agency), limited to their own agency. Read-only
on validation.

- Overview
- Teams
- Officers
- Actions and trip statuses
- Penalties
- Transaction validation status
- Linked cases

## Intelligence and money

### M16 Pattern Engine — no sub-modules

Pattern analysis, used by the Intelligence Officer.

### M17 Suspect Register — no sub-modules

Suspect analysis, used by the Intelligence Officer.

### M18 Tag Management — no sub-modules

Tags by plate, with a status and a flag: unreported damage is flagged as
tampering; not picked is flagged as an offense.

### M19 Financial Adjustment (Refunds) — no sub-modules

Refunds, processed by Finance / Treasury. Only for cases marked "Payment Under
Duress – Verified"; the amount is calculated by the system and deducted only
from the enforcement budget (non-IGR component) of the IRS remittance.

### M20 EDMS — no sub-modules

Named in the specification without further detail.

## Shared services

### Notifications — has sub-modules

- SMS
- Email
- In-app

### Communication — has sub-modules

- Chat
- Group chat
- Case-linked threads
- Files
- WebRTC voice

### Access, Audit and Security — has sub-modules

- RBAC (scoped by party and jurisdiction)
- Audit log (immutable)
- Encryption (in transit and at rest; encrypted messaging)
- Identity

## Parties and their dashboards

| Party | Dashboard | Has field agents? |
|---|---|---|
| Control Center | M2 Control Center Console | No |
| State IRS | M11 | Yes |
| Law Enforcement | M12 | Yes |
| Central Enforcement | M13 | TBC |
| Command & Control | M14 | TBC |
| Legal | M15 | No |
| Finance / Treasury | M19 Financial Adjustment | No |
| Intelligence Officer | M16 Pattern Engine, M17 Suspect Register | No |
| Agency Head (addendum) | Agency Head View | — |

## Open items (as the specification leaves them)

- The exact responsibilities of Central Enforcement and Command & Control.
- Whether Central Enforcement and Command & Control have field agents.
- The routing permission rows for Law Enforcement, Central Enforcement and
  Command & Control.
- Whether only non-compliant actions create cases (an assumption to confirm).
- The tag lifecycle states.
- Penalty / payment source of truth (CHL Systems): webhook or polling.
- Data protection compliance (NDPA).
