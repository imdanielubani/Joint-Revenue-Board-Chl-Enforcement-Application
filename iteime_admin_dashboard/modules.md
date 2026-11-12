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
| 8 | Communication | Yes | Every role |
| 9 | Notifications | No | Every role |
| 10 | Administration | Yes | Super Admin (and the Agency Head for teams) |
| — | Account | Yes | Every role (top-bar menu, not the sidebar) |

Sidebar groups, top to bottom:

```
WORK          Overview · Intake · Cases
OPERATIONS    Field Operations · Payments
INSIGHT       Intelligence · Documents
              ─────────────
              Communication · Notifications
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
| Control Center overview | Control Center | The intake queue, cases created, intake time, routing, SMS confirmations and status lookups |
| Command & Control overview | Command & Control | Oversight and prioritisation across all parties |
| Legal overview | Legal | Escalated cases awaiting review, cases marked for prosecution |
| Agency overview | Agency Head | The agency's teams, officers, actions, trip statuses, penalties, transaction validation status and linked cases |

### What each party sees on its Overview

Every view keeps the same header (greeting, the one alert that needs action,
filters, Export). Only the Control Center creates cases, so **New case**
appears only for the Control Center and the Super Admin. Sidebars show only
the modules the role may open (see [Who sees what](#who-sees-what)).

| Party | Scope | Alert line | Filters | Headline figures | Cards |
|---|---|---|---|---|---|
| **Super Admin** (All parties tab) | All parties, all states | Transfers waiting | Period, State, Party | Open cases, Escalated, Penalties raised (₦), Penalties paid (₦); then In the intake queue, Waiting for a priority, Waiting for legal review, SLA met | Every party at a glance (one card per party with its key figures, what needs attention and a link to its tab); Cases by stage; Needs your decision; Live activity with map; Penalties and payments (₦) with payment validation; Cases by source; Escalations by reason; SLA performance by party; Recent cases |
| **Control Center** | All channels | Reports waiting in the intake queue | Period (default Today), Channel, Agent | In the intake queue, Cases created today, Average intake time (target 2 minutes), Waiting to be routed | Queue by channel; Next in the queue (triage, route); Cases created (last 7 days); Routed today by party; SMS confirmations; Status lookups; Recently created cases (with SMS status) |
| **State IRS** | Its state | Transfers waiting | Period, LGA, Team | Open cases in the state, Transfers to decide, Penalties raised by its agents (₦), Penalties paid (₦) | Cases by stage; Needs your decision (transfers, SLA at risk, out-of-zone actions); Its agents in the field (map, agents on duty, most active); Penalties and payments (₦); Payment validation; Recent cases in the state |
| **Law Enforcement** | Its command | Transfers waiting | Period, LGA, Team | Cases assigned to it, In investigation, Transfers to decide, Penalties by its officers (₦) | Its cases by stage; Needs your decision; Its officers in the field (map, officers on duty, recent actions); Recent cases assigned to it |
| **Central Enforcement** | All states | Escalations with no team assigned | Period, State, Reason | Escalated cases, SLA breaches, Multiple actors, Cross-state cases | Escalations by reason; Escalation queue (assign a team); Escalations by state; Cross-state cases; Recent escalations |
| **Command & Control** | All parties, all states | Cases waiting for a priority | Period, State, Party | Open cases (all parties), Escalated, SLA met (%), Waiting for a priority | Open cases by party; Waiting for a priority; SLA performance by party; Activity by state; Recently escalated (with priority) |
| **Legal** | Cases sent for legal review | Cases waiting for legal review | Period, Reason, From party | Waiting for review, Under review, Marked for prosecution, Reviewed | Legal review queue; Recently marked for prosecution; Cases in review by escalation reason |

To confirm: Central Enforcement and Command & Control duties (the
specification leaves them open), the priority levels Command & Control sets,
and whether Legal sees cases that were not escalated.

## 2. Intake — has sub-modules

Where taxpayer grievances arrive and become cases. Used by the Control
Center.

Two sub-modules in the sidebar:

- **Intake queue**: grievances from every channel in one queue, filterable by
  channel (call, SMS, USSD, WhatsApp, web / app). **Cases to route** opens
  from the queue header: cases not routed yet, cases a party returned, and
  cases routed today.
- **Triage**: review an item and decide what it becomes.

New case and Status lookup are popups, not sub-modules. They open from the
header buttons on every Intake screen.

- **New case** (popup, in steps): Reporter → Incident → Location → People
  involved → Review → Route. The fields are name, phone, plate, location
  (State, LGA, Area, Bus Stop), case type (mandatory), actors with
  descriptions, date/time and reporter type. **Create case** at Review gives
  a unique case ID (e.g. `JRB/CHL/KEB/001`), saves the call log, starts the
  SLA timer and sends an SMS confirmation. The last step routes the case to
  the relevant party, or to every relevant party when several actors are
  involved. **Route later** leaves it in Cases to route.
- **Route case** (popup): routes a case from Cases to route, including one a
  party returned.
- **Status lookup** (popup): find a case by the taxpayer's phone number or
  plate number, to answer a status call.

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

## 8. Communication — has sub-modules

Called Communication, as in the specification ("chat, group chat,
case-linked threads, files, WebRTC voice").

- **Chats**: one-to-one and group chats, with a New chat popup that becomes a
  group when several people are chosen.
- **Case threads**: conversations linked to a case, shared by every party on
  it, with case events (created, routed, escalated, accepted) in line. Also
  shown on the case page.
- **Files**: files shared in chats and case threads.
- **Voice calls**: call history, and calls made in the browser (calling, in
  call, ended).

## 9. Notifications — no sub-modules

The in-app notification list, opened from the top-bar bell. SMS and email
notifications are sent by the system and are not pages.

## 10. Administration — has sub-modules

Managed by the [Super Admin](#super-admin).

- **Users and roles**: the people who use ITEIME and what each may do. For
  every user: their party, role and jurisdiction (state, and agency where
  relevant). For every role: its permissions, meaning which modules it can
  open and which actions it can take in them. Access is given only through a
  role; nobody is given a module directly.
- **Routing permissions**: the table of which party may route to which.
  Stored as data, editable without a redeploy. Decided by the product owner
  (not in the specification):
  - Control Center can also receive routed cases (a "To Control Center"
    column), not only rejected ones.
  - State IRS to State IRS covers other states only, and the Super Admin
    chooses which states (or any other state).
  - Legal, Finance / Treasury and Intelligence Officer do not route cases.
- **Audit log**: every recorded action, with who, what, before and after,
  when, and from which IP / device. Read-only.

## Super Admin

Added by the product owner; the specification does not name this role.

The Super Admin gives access to everyone else, based on role and permission.

- **Grants access.** Creates users, assigns each one a party, role and
  jurisdiction, and sets what each role is permitted to see and do. Changing a
  role's permissions changes it for everyone who holds that role.
- **Sees everything.** All modules, all parties and all states, so the
  Super Admin can check what any role sees. The Super Admin role always has
  full access: its permissions are locked, and it can't be edited or deleted.
- **Sees every Overview.** The Super Admin Overview has a party tab bar:
  All parties · Control Center · State IRS · Law Enforcement · Central
  Enforcement · Command & Control · Legal. All parties is the national view;
  each other tab shows exactly what that party sees, inside the Super Admin
  sidebar, with a note naming the party. State IRS and Law Enforcement add a
  State filter to choose which state. Each tab shows how many items need that
  party's attention.
- **Manages the rules.** Routing permissions and other settings stored as
  data.
- **Is accountable.** Every access change (user added, role or permission
  changed, access removed) is written to the audit log with who made it and
  the before and after.
- **Workspace.** Shown as "Super Admin · All parties · All states" in the
  workspace switcher. A Super Admin who also holds a party role can switch to
  it to see the dashboard exactly as that role does.

## Account — has sub-modules

From the top-bar menu, not the sidebar.

- **Sign in**
- **Profile**: the user's details, and their party, role and jurisdiction
  (read-only; managed in Administration). A **Password and sign-in** tab
  changes the password.
- **Sign out**

## Who sees what

✓ sees it · ◐ part of it · — does not. Rows marked † are not stated in the
specification and need confirming.

This is the starting point for each role's permissions. The Super Admin sets
the final permissions in Administration › Users and roles.

| Module | Control Center | State IRS | Law Enforcement | Central Enforcement | Command & Control | Legal | Finance / Treasury | Intelligence Officer | Agency Head | Super Admin |
|---|---|---|---|---|---|---|---|---|---|---|
| Overview | † | ✓ | ✓ | ✓ | ✓ | ✓ | † | † | ✓ | ✓ |
| Intake | ✓ | — | — | — | † | — | — | — | — | ✓ |
| Cases | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ Legal review | ◐ refund cases | † | ◐ linked cases | ✓ |
| Field Operations | — | ✓ | ✓ | † | † | — | — | † | ✓ | ✓ |
| Payments | — | ◐ | ◐ | † | † | — | ◐ Refunds | — | ◐ read-only | ✓ |
| Intelligence | — | — | — | † | † | — | — | ✓ | — | ✓ |
| Documents | † | † | † | † | † | † | † | † | † | ✓ |
| Communication | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Administration | — | — | — | — | — | — | — | — | ◐ Teams | ✓ |

## Where each specification module went

| Specification | Now |
|---|---|
| M1 Multi-Channel Intake | Intake › Intake queue |
| M2 Control Center Console | Intake › Triage; New case popup (ends with Route); Cases to route |
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
| Communication (shared) | Communication; Case page › Thread |
| RBAC, audit log, identity (shared) | Administration (run by the Super Admin); Account |
| Taxpayer status lookup | Intake › Status lookup popup |

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
11. Communication
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
- How many Super Admins there are and who appoints them, and whether a
  second person must approve access changes.
