# ITEIME Admin Dashboard – UI Screens

Every screen of the ITEIME Admin Dashboard, module by module, from
Authentication onwards. Use it as the checklist for design and, later, for
prototyping. Modules and sub-modules follow [modules.md](modules.md).

Every screen is designed in **Light** and **Dark**, at desktop width (1440)
unless it says otherwise. Each module has its own page in the Figma file, in
the same order as this list.

**Status:** ✅ Designed · ⬜ To design

The sample signed-in user is **Daniel Ubani**, Super Admin.

## Foundations and components

| Item | Status |
|---|---|
| Logo (horizontal and shield, light and dark) | ✅ |
| Colour tokens (Light and Dark modes), spacing, radius | ✅ |
| Type styles (Geist), shadows, focus rings | ✅ |
| Components: Button, Input Field, Alert, Password Requirement, Theme Toggle, Nav Item, Sub Nav Item, Icon Button, Avatar, Top Search, Filter Select, Workspace Switcher, Menu Item, Notification Item, Tooltip, Toast, Skeleton, Status Badge, Stat Card, icons | ✅ |
| Components still needed as modules are designed: table, tabs, drawer, form fields (select, date, textarea, file upload), pagination, timeline, map | ⬜ |

## 1. Authentication

| Screen | Status |
|---|---|
| Sign in – default | ✅ |
| Sign in – wrong details | ✅ |
| Sign in – signing in | ✅ |
| Sign in – temporarily locked | ✅ |
| Sign in – signed out | ✅ |
| Forgot password – enter email | ✅ |
| Forgot password – check your email | ✅ |
| Reset password – set new password | ✅ |
| Reset password – link expired | ✅ |
| Reset password – password updated | ✅ |
| Session – signed out after inactivity | ✅ |
| Access – no access to ITEIME | ✅ |

## 2. App shell

| Screen | Status |
|---|---|
| Shell – expanded sidebar, collapsed sidebar | ✅ |
| Sidebar – every module dropdown open | ✅ |
| Sidebar – collapse and expand on logo hover | ✅ |
| User menu, notifications panel, workspace switcher | ✅ |
| Notifications panel – all caught up | ✅ |
| Global search (Ctrl K) – results and no results | ✅ |
| Session expiring warning | ✅ |
| Collapsed sidebar tooltip, toast | ✅ |
| Page states – loading, couldn't load, no access to module, page not found, live updates paused | ✅ |
| Tablet (1024), phone (390), phone navigation drawer | ✅ |
| Collapsed sidebar – sub-module pop-out menu | ⬜ |
| Role-based sidebars (State IRS, Legal, Finance / Treasury, Agency Head) | ⬜ |
| Keyboard shortcuts dialog | ⬜ |
| Detail page header with breadcrumb and back | ⬜ |
| Phone – search, notifications and user menu as full-screen sheets | ⬜ |
| Keyboard focus states on sidebar and top bar | ⬜ |

## 3. Overview

| Screen | Status |
|---|---|
| Overview – Super Admin (headline figures, cases by stage, needs your decision, live activity with map, penalties and payments in naira, cases by source, recent cases) | ✅ |
| Filters – Period open (single choice) | ✅ |
| Filters – Custom period (calendar, from and to) | ✅ |
| Filters – State open (search, several states, selected pinned) | ✅ |
| Filters – Party open (all eight parties, several at once) | ✅ |
| Filters – applied (values in the filters, Reset filters, figures updated) | ✅ |
| Overview – loading | ✅ |
| Overview – no activity in the period | ✅ |
| Overview – map failed to load (rest of the page still works) | ✅ |
| Chart – hover tooltip on a stage | ✅ |
| Map – pin selected (details: amount, plate, place, officer, team, case, evidence) | ✅ |
| Needs your decision – review transfer (reject with a required reason) | ✅ |
| Export – menu (PDF, CSV) and export in progress | ✅ |
| Overview – Control Center | ✅ |
| Overview – State IRS | ✅ |
| Overview – Law Enforcement | ✅ |
| Overview – Central Enforcement | ✅ |
| Overview – Command & Control | ✅ |
| Overview – Legal | ✅ |
| Overview – Agency Head | ⬜ |
| Overview – tablet and phone | ⬜ |

## 4. Intake

| Screen | Status |
|---|---|
| Intake queue – all channels, filtered by channel | ⬜ |
| Triage – review an item | ⬜ |
| New case – form (name, phone, plate, location, case type, actors, date/time, reporter type) | ⬜ |
| New case – validation errors | ⬜ |
| New case – created (case ID, SLA started, SMS sent) | ⬜ |
| Route – choose party or parties | ⬜ |
| Status lookup – by phone or plate, results and no results | ⬜ |

## 5. Cases

| Screen | Status |
|---|---|
| All cases – register with filters | ⬜ |
| All cases – empty and no results | ⬜ |
| Case page – Summary | ⬜ |
| Case page – Actors and reporter | ⬜ |
| Case page – Location | ⬜ |
| Case page – Linked cases (parent and children) | ⬜ |
| Case page – Enforcement (action, penalty, payment) | ⬜ |
| Case page – Evidence and files | ⬜ |
| Case page – Notes | ⬜ |
| Case page – Thread | ⬜ |
| Case page – History | ⬜ |
| Case actions – change status, assign, escalate | ⬜ |
| Case actions – transfer (party, state, reason) | ⬜ |
| Case actions – add child case, request refund | ⬜ |
| Transfers – incoming and outgoing | ⬜ |
| Transfers – accept and reject (with reason) | ⬜ |
| Escalations – list with reason | ⬜ |
| Legal review – list, legal notes, mark for prosecution | ⬜ |

## 6. Field Operations

| Screen | Status |
|---|---|
| Live activity feed – map and list | ⬜ |
| Enforcement actions – log with filters | ⬜ |
| Enforcement action – detail (GPS, evidence, team) | ⬜ |
| Agents – list | ⬜ |
| Agent – profile and activity | ⬜ |
| Agents – onboard a new agent | ⬜ |
| Teams – list | ⬜ |
| Team – officers and history | ⬜ |
| Teams – create team, add or move an officer | ⬜ |

## 7. Payments

| Screen | Status |
|---|---|
| Penalties – list with status | ⬜ |
| Penalty – detail (dispute opens a linked case) | ⬜ |
| Transactions – list with validation status | ⬜ |
| Transaction – detail (validated by, where, when) | ⬜ |
| Refunds – list | ⬜ |
| Refund – detail and approval | ⬜ |

## 8. Intelligence

| Screen | Status |
|---|---|
| Patterns | ⬜ |
| Suspect register – list | ⬜ |
| Suspect – detail | ⬜ |
| Tags – list with status and flags | ⬜ |
| Tag – detail | ⬜ |

## 9. Documents (EDMS)

| Screen | Status |
|---|---|
| Documents – library | ⬜ |
| Document – preview | ⬜ |
| Documents – upload | ⬜ |

## 10. Messages

| Screen | Status |
|---|---|
| Chats – list and conversation | ⬜ |
| Group chat | ⬜ |
| Case threads | ⬜ |
| Files | ⬜ |
| Voice call – calling, in call, ended | ⬜ |

## 11. Notifications

| Screen | Status |
|---|---|
| Notifications – full page (all, unread) | ⬜ |
| Notifications – empty | ⬜ |

## 12. Administration (Super Admin)

| Screen | Status |
|---|---|
| Users – list | ⬜ |
| User – invite or create (party, role, jurisdiction) | ⬜ |
| User – detail, change role, deactivate | ⬜ |
| Roles and permissions – list of roles | ⬜ |
| Role – permissions (modules and actions) | ⬜ |
| Routing permissions – From / To table | ⬜ |
| Audit log – list with filters | ⬜ |
| Audit entry – detail (before and after) | ⬜ |

## 13. Account

| Screen | Status |
|---|---|
| Profile | ⬜ |
| Change password | ⬜ |

## Prototyping

Not started. Prototype links will be added module by module once the screens
above are designed.
