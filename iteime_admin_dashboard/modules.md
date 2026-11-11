# ITEIME Admin Dashboard – Modules

The ITEIME Admin Dashboard's modules, arranged as the product's navigation:
what a signed-in user sees in the sidebar, and what sits inside each item. The
content comes from **ITEIME – Developer Specification** (PRD V1) in this
folder; the arrangement is by how people work, not by the specification's
M1–M20 numbering. [Where each specification module went](#where-each-specification-module-went)
traces every M-number to its place here.

This folder will hold the dashboard's code. For now the work is the UI design
only; no code is written yet.

## Design principles behind the arrangement

1. **One shell, scoped by role.** The specification asks for one dashboard
   shell scoped by party and jurisdiction. So State IRS, Law Enforcement,
   Central Enforcement, Command & Control, Legal and the Agency Head do not get
   six separate products: they share the same modules, and each sees only the
   items and records their role allows.
2. **Organised around the case.** The case is the product's core object.
   Lifecycle, SLA, transfers, linked cases, actors, notes and threads are not
   separate destinations: they are parts of one case page.
3. **Work queues before reports.** People open the dashboard to act: triage
   the intake queue, accept or reject transfers, deal with escalations. Those
   queues are top-level items; overviews and logs sit beside them.
4. **Engines are behaviour, not pages.** Multi-actor accountability, SLA
   escalation and routing rules run in the background. Users see their
   effects (an escalated flag, a case in a queue), and administrators manage
   their settings.
5. **The Field App stays in the field.** Trip checks, penalties, evidence,
   GPS and transaction validation are done in the mobile app
   ([`jbr_chl_enforcement/`](../jbr_chl_enforcement/)). The dashboard shows
   what it records.

## Navigation at a glance

| # | Module | Sub-modules | Main users |
|---|---|---|---|
| 1 | Overview | Yes | Every role (content scoped by role) |
| 2 | Intake | Yes | Control Center |
| 3 | Cases | Yes | Every party that owns or receives cases |
| 4 | Field Operations | Yes | State IRS, Law Enforcement, Agency Head |
| 5 | Payments | Yes | Parties with field agents, Agency Head, Finance / Treasury |
| 6 | Intelligence | Yes | Intelligence Officer, Command & Control |
| 7 | Documents (EDMS) | No | To be confirmed |
| 8 | Messages | Yes | Every role |
| 9 | Notifications | No | Every role |
| 10 | Administration | Yes | Designated admins (and the Agency Head for teams) |
| — | Account | Yes | Every role (top-bar menu, not the sidebar) |

Sidebar groups, top to bottom:

```
WORK          Overview · Intake · Cases
OPERATIONS    Field Operations · Payments
INSIGHT       Intelligence · Documents
              ─────────────
              Messages · Notifications
ADMIN         Administration
```

## 1. Overview — has sub-modules

The landing page after sign-in. One page, whose content changes with the
user's role and jurisdiction. Each view shows that party's **Cases** and
**Transactions** (trip checks, penalties raised, penalties paid).

| Sub-module | For | Shows |
|---|---|---|
| State IRS overview | State IRS | Its state's cases; its own agents' actions |
| Law Enforcement overview | Law Enforcement | Cases received; its own officers' actions |
| Central Enforcement overview | Central Enforcement | Escalations, SLA breaches, cross-state cases |
| Command & Control overview | Command & Control | Oversight and prioritisation across all parties |
| Legal overview | Legal | Escalated cases awaiting review, cases marked for prosecution |
| Agency overview | Agency Head | The agency's teams, officers, actions, trip statuses, penalties, transaction validation status and linked cases |

## 2. Intake — has sub-modules

Where taxpayer grievances arrive and become cases. Used by the Control
Center.

- **Intake queue**: grievances from every channel in one queue, filterable by
  channel (call, SMS, USSD, WhatsApp, web / app).
- **Triage**: review an item and decide what it becomes.
- **New case**: name, phone, plate, location (State, LGA, Area, Bus Stop),
  case type (mandatory), actors with descriptions, date/time, reporter type.
  On saving: a unique case ID (e.g. `JRB/CHL/KEB/001`), the call log saved,
  the SLA timer started, an SMS confirmation sent.
- **Route**: send the new case to the relevant party, or to every relevant
  party when several actors are involved.
- **Status lookup**: find a case by the taxpayer's phone number or plate
  number, to answer a status call.

## 3. Cases — has sub-modules

Every case the user's role and jurisdiction may see, from both origins
(grievance and enforcer-detected).

- **All cases**: the case register, with filters for status, origin, case
  type, escalated, SLA, party, state and team.
- **Transfers**: the transfer inbox.
  - *Incoming*: cases sent to the user's party, to accept or reject.
  - *Outgoing*: cases the party has sent, with their decision.
- **Escalations**: escalated cases, with why (SLA breach, multiple actors,
  manual).
- **Legal review**: escalated cases for Legal, with legal notes and marking
  for prosecution.
- **Case page**: one case, in tabs.
  - *Summary*: case ID, origin, type, status, escalated flag, SLA due time,
    complexity (single / multi-state), states, current owner, layer.
  - *Actors and reporter*: each actor (IRS, Police, Enforcement Agent,
    Civilian/Unknown) with a description; the reporter's details.
  - *Location*: State, LGA, Area, Bus Stop and map point.
  - *Linked cases*: the parent and its child cases, each with its own ID and
    status. A parent closes only when every child is closed.
  - *Enforcement*: the field action that created the case, its penalty and
    payment (enforcer-detected cases).
  - *Evidence and files*
  - *Notes*
  - *Thread*: the case-linked conversation.
  - *History*: status changes, transfers and ownership, from the audit log.
  - *Actions*: change status (defined transitions only), assign, escalate,
    transfer, add a child case, request a refund, as the user's role allows.

## 4. Field Operations — has sub-modules

What field agents are doing, live. Scoped to the user's own agency, state and
officers.

- **Live activity feed**: enforcement actions as they happen, on a map and
  in a list; penalty changes (raised, paid, disputed) appear in real time;
  out-of-zone actions are flagged.
- **Enforcement actions**: the log of trip checks, penalties and
  inspections, compliant or non-compliant, with GPS, evidence and team.
- **Agents**: field agents with their agency, state, zones, team, status and
  device; onboarding of new agents.
- **Teams**: teams and their officers; moving an officer keeps their history.
  Managed by the Agency Head and designated admins.

## 5. Payments — has sub-modules

- **Penalties**: raised, paid, disputed or waived. A dispute opens a linked
  grievance case.
- **Transactions**: payments synced in from the external payment system,
  each linked to its penalty, with its validation status (pending, validated,
  flagged) set by field officers in the Field App. Read-only on the
  dashboard.
- **Refunds**: for cases marked "Payment Under Duress – Verified" only. The
  amount is calculated by the system and deducted from the enforcement budget
  (non-IGR component) of the IRS remittance. Processed by Finance / Treasury.

## 6. Intelligence — has sub-modules

- **Patterns**: pattern analysis across cases and actions.
- **Suspect register**: suspects and their analysis.
- **Tags**: tags by plate, with status and flags (tampering for unreported
  damage, offense for not picked).

## 7. Documents (EDMS) — no sub-modules

The electronic document management system. Named in the specification
without further detail.

## 8. Messages — has sub-modules

- **Chats**: one-to-one and group chats.
- **Case threads**: conversations linked to a case (also shown on the case
  page).
- **Files**: files shared in conversations.
- **Voice calls**

## 9. Notifications — no sub-modules

The in-app notification list, opened from the top-bar bell. SMS and email
notifications are sent by the system and are not pages.

## 10. Administration — has sub-modules

- **Users and roles**: users, their party, role and jurisdiction.
- **Routing permissions**: the table of which party may route to which.
  Stored as data, editable without a redeploy.
- **Audit log**: every recorded action, with who, what, before and after,
  when, and from which IP / device. Read-only.

## Account — has sub-modules

From the top-bar menu, not the sidebar.

- **Sign in**
- **Profile**: the user's party, role and jurisdiction.
- **Sign out**

## Who sees what

✓ sees it · ◐ part of it · — does not. Rows marked † are not stated in the
specification and need confirming.

| Module | Control Center | State IRS | Law Enforcement | Central Enforcement | Command & Control | Legal | Finance / Treasury | Intelligence Officer | Agency Head | Admin |
|---|---|---|---|---|---|---|---|---|---|---|
| Overview | † | ✓ | ✓ | ✓ | ✓ | ✓ | † | † | ✓ | † |
| Intake | ✓ | — | — | — | † | — | — | — | — | — |
| Cases | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ Legal review | ◐ refund cases | † | ◐ linked cases | † |
| Field Operations | — | ✓ | ✓ | † | † | — | — | † | ✓ | — |
| Payments | — | ◐ | ◐ | † | † | — | ◐ Refunds | — | ◐ read-only | — |
| Intelligence | — | — | — | † | † | — | — | ✓ | — | — |
| Documents | † | † | † | † | † | † | † | † | † | † |
| Messages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Administration | — | — | — | — | — | — | — | — | ◐ Teams | ✓ |

## Where each specification module went

| Specification | Now |
|---|---|
| M1 Multi-Channel Intake | Intake › Intake queue |
| M2 Control Center Console | Intake › Triage, New case, Route |
| M3 Case Management Engine | Cases › Case page (Summary, History, Actions) |
| M4 Routing & Transfer | Cases › Transfers; Case page › Actions; Administration › Routing permissions |
| M5 Multi-Actor Accountability | Background rule; seen in Cases › Escalations and Case page › Actors |
| M6 Linked Cases | Cases › Case page › Linked cases |
| M7 Field Agent Management | Field Operations › Agents, Teams |
| M8 Field Enforcement App | The mobile app; its records show in Field Operations and Payments |
| M9 Penalty & Payment Tracker | Payments › Penalties, Transactions |
| M10 Enforcement Activity Feed | Field Operations › Live activity feed |
| M11 State IRS | Overview › State IRS overview (plus scoped Cases, Field Operations, Payments) |
| M12 Law Enforcement | Overview › Law Enforcement overview (same) |
| M13 Central Enforcement | Overview › Central Enforcement overview; Cases › Escalations |
| M14 Command & Control | Overview › Command & Control overview |
| M15 Legal | Overview › Legal overview; Cases › Legal review |
| Agency Head (addendum) | Overview › Agency overview; Administration › Teams access |
| M16 Pattern Engine | Intelligence › Patterns |
| M17 Suspect Register | Intelligence › Suspect register |
| M18 Tag Management | Intelligence › Tags |
| M19 Financial Adjustment | Payments › Refunds |
| M20 EDMS | Documents |
| Notifications (shared) | Notifications (in-app); SMS and email in the background |
| Communication (shared) | Messages; Case page › Thread |
| RBAC, audit log, identity (shared) | Administration; Account |
| Taxpayer status lookup | Intake › Status lookup |

## Suggested design order

Following the specification's build order, so each screen has what it
depends on:

1. Account (sign in) and the app shell: sidebar, top bar, role scoping
2. Cases: All cases and the Case page
3. Intake: queue, triage, new case, route
4. Cases › Transfers, and Administration › Routing permissions
5. Overview: State IRS first, then Law Enforcement
6. Field Operations: Agents and Teams, then Enforcement actions and the Live
   activity feed
7. Payments: Penalties and Transactions
8. Cases › Escalations; the Central Enforcement and Command & Control
   overviews
9. Case page › Linked cases
10. Legal review, Intelligence › Tags, Payments › Refunds
11. Messages
12. Intelligence › Patterns and Suspect register; Documents

## Open items (as the specification leaves them)

- The exact responsibilities of Central Enforcement and Command & Control.
- Whether Central Enforcement and Command & Control have field agents.
- The routing permission rows for Law Enforcement, Central Enforcement and
  Command & Control.
- Whether only non-compliant actions create cases (an assumption to confirm).
- The tag lifecycle states.
- What Documents (EDMS) holds and who uses it.
- Penalty / payment source of truth (CHL Systems): webhook or polling.
- Data protection compliance (NDPA).
- The access marked † in [Who sees what](#who-sees-what).
