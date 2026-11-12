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
| Components: Button, Input Field, Alert, Password Requirement, Theme Toggle, Nav Item, Sub Nav Item, Icon Button, Avatar, Top Search, Filter Select, Workspace Switcher, Menu Item, Notification Item, Tooltip, Toast, Skeleton, Status Badge, Stat Card, Checkbox, Segmented Tab, Row Actions (⋯), Pagination, Map Base, icons (including Mic and Mic Off) | ✅ |
| Components still needed as modules are designed: table, tabs, drawer, form fields (select, date, textarea, file upload), pagination, timeline, map | ⬜ |

## 1. Authentication

| Screen | Status |
|---|---|
| Sign in – default | ✅ |
| Sign in – wrong details | ✅ |
| Sign in – signing in | ✅ |
| Sign in – temporarily locked | ✅ |
| Sign in – signed out | ✅ |
| Forgot password – enter email (send a 6-digit verification code) | ✅ |
| Forgot password – enter verification code (resend code, use a different email) | ✅ |
| Forgot password – wrong code | ✅ |
| Reset password – code expired (send a new code) | ✅ |
| Reset password – set new password | ✅ |
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
| Case tables – Action column with ⋯ on every Overview, and the row-actions menu open | ✅ |
| Super Admin – party tabs on every Overview screen | ✅ |
| Super Admin – All parties shows every party (attention figures, every party at a glance, escalations, SLA by party) | ✅ |
| Super Admin – each party tab (Control Center, State IRS, Law Enforcement, Central Enforcement, Command & Control, Legal) | ✅ |
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
The sidebar shows two sub-modules: Intake queue and Triage. New case and
Status lookup open as popups from the header buttons. Cases to route opens from
the Intake queue header.

| Screen | Status |
|---|---|
| Intake queue – all channels, with channel tabs and counts, coloured channels and statuses, pagination; header: Cases to route, Status lookup, New case | ✅ |
| Intake queue – queue clear | ✅ |
| Intake queue – filtered to one channel (WhatsApp) | ✅ |
| Intake queue – row actions (⋯ menu: open in triage, assign to me, start a new case, add to an existing case, copy reference, not a case) | ✅ |
| Triage – review a report (live call timer, notes, picked-out details, possible duplicate; create case, add to existing case, not a case) | ✅ |
| Triage – WhatsApp (thread, photo, reply), SMS (reply, 160 characters), USSD (menu answers, call back), web form (fields, attachments) | ✅ |
| Triage – "Not a case" dialog (reason, note, SMS the reporter) | ✅ |
| Triage – "Add to an existing case" dialog (search, choose, notify owner) | ✅ |
| New case popup – steps Reporter, Incident, Location, People involved (intake timer, step progress, Back and Continue) | ✅ |
| New case popup – Reporter with a validation error | ✅ |
| New case popup – Review (summary with Edit per step, possible duplicate, SMS preview, escalation notice; Create case) | ✅ |
| New case popup – Route (case created, recommended parties, other parties, message; Route later) | ✅ |
| New case popup – Route: no party chosen, receiving office open, routing, couldn't route | ✅ |
| New case popup – done (created and routed, who has the case now) | ✅ |
| Cases to route – All tab (search; Status, Party, Case type and Created filters; Status column: Not routed, Escalated, Returned, Waiting to accept, Accepted; Party column; ⋯ actions; pagination) | ✅ |
| Cases to route – Waiting to route, Returned and Routed today tabs | ✅ |
| Cases to route – Status filter open (several statuses, counts, Clear, Show cases) | ✅ |
| Cases to route – row actions (route case, open case, assign to me, copy case ID, copy link, mark as duplicate) | ✅ |
| Route case popup – returned case (reason, rejecting party marked, route again) | ✅ |
| Status lookup popup – by phone number: before a search, results (⋯ on each case), no results | ✅ |
| Status lookup popup – by plate number: before a search, results (⋯ on each case), no results | ✅ |

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

## 10. Communication

| Screen | Status |
|---|---|
| Chats – list (search; All, Unread, Groups) and one-to-one conversation (case link, shared file, read receipt, composer) | ✅ |
| Chats – conversation menu (view profile, search in this chat, mute notifications, mark as unread, copy chat link, delete chat) | ✅ |
| Chats – New chat popup (choose people; several people make a group) | ✅ |
| Chats – plus menu (upload a file, link a case, share from Documents, record a voice note) | ✅ |
| Chats – uploading a file (progress, cancel), recording a voice note (timer, waveform, discard, send) | ✅ |
| Chats – link a case popup | ✅ |
| Chats – share from Documents popup (search; All, Case files, Policies and guides; choose several; share) | ✅ |
| Chats – view profile popup, delete chat confirm, notifications muted (toast) | ✅ |
| Chats – Unread tab, search with no results | ✅ |
| Group chat – members popup (admin, add people, leave group) | ✅ |
| Group chat (members, sender names and parties) | ✅ |
| Case threads – list by case and thread with case events (created, routed, escalated, accepted) | ✅ |
| Files – list (type, shared in, shared by, date; filters; pagination) | ✅ |
| Voice calls – history (outgoing, incoming, missed, group; call back) | ✅ |
| Voice call – calling, in call (mute, chat, add people, end call), in call muted, ended | ✅ |
| Chats – search in this chat (matches highlighted, 2 of 3, previous and next) | ✅ |
| Voice calls – group call (participants, who is speaking, who is muted, leave) | ✅ |
| Communication – loading; chats empty; files empty | ✅ |
| Communication – errors: message not sent (try again), upload failed, call couldn't connect, microphone blocked | ✅ |
| Chats – error messages: file type not supported, voice note too short, group name missing, chat with a deactivated user (read only) | ✅ |
| Communication – couldn't load: chats, case threads, files, voice calls (try again, reference) | ✅ |

## 11. Notifications

| Screen | Status |
|---|---|
| Notifications – All, Unread and Mentions tabs (grouped by day, coloured by type, unread highlighted; search; Type and When filters; pagination; mark all as read) | ✅ |
| Notifications – row actions (open case, mark as read, copy link, remove) | ✅ |
| Notifications – top bar dropdown from the bell (All, Unread, Mentions; mark all as read; view all notifications) and all caught up | ✅ |
| Notifications – Type filter open (types with counts) | ✅ |
| Notifications – all marked as read (toast) | ✅ |
| Notifications – loading, empty (no notifications yet), unread empty (you're all caught up) | ✅ |

## 12. Administration (Super Admin)

| Screen | Status |
|---|---|
| Users – list (search; Role, Party, State and Status filters; status: Active, Invited, Locked, Deactivated; pagination) | ✅ |
| Users – row actions (view user, change role, unlock account, copy email, deactivate user) | ✅ |
| User – invite (name, email, role, party set by the role, jurisdiction; what the role can open) | ✅ |
| User – details popup (access, modules it can open, recent activity; open audit log, deactivate) | ✅ |
| User – change role (new role and agency, before and after, reason for the audit log) | ✅ |
| User – deactivate (reason; cases and history kept) | ✅ |
| User – unlock account (reason), email copied (toast). Passwords are reset by the user with a verification code, not by an administrator. | ✅ |
| Users – loading and empty (no other users yet) | ✅ |
| Roles – list (what each role is for, users, modules it can open, last changed) | ✅ |
| Roles – row actions (view permissions, edit permissions, see users with this role, show change history, duplicate role, delete role) | ✅ |
| Roles – row action popups: users with this role, change history, duplicate role, delete role (blocked while users hold it) | ✅ |
| Roles – loading and empty (no roles yet) | ✅ |
| Role – Super Admin: full access, permissions locked (cannot be edited or deleted) | ✅ |
| Role – permissions for every role: Super Admin, Control Center, State IRS, Agency Head, Law Enforcement, Central Enforcement, Command & Control, Legal, Finance / Treasury, Intelligence Officer, Field Officer | ✅ |
| Role – permissions (scope; modules × view, create, edit, route or transfer, export; "to confirm" where the specification is open; unsaved changes bar) | ✅ |
| Routing permissions – From / To matrix from the specification's draft (allowed, to confirm, not applicable; last change) | ✅ |
| Routing permissions – editing (allowed / not allowed per pair, unsaved changes bar) | ✅ |
| Routing permissions – "routes still need a decision" banner for the pairs left open in the specification | ✅ |
| Routing permissions – save with a reason, turn off a route (cases still waiting; reason), leave without saving | ✅ |
| Routing permissions – saved (toast, last change updated), couldn't save (edits kept, try again) | ✅ |
| Routing permissions – change history popup | ✅ |
| Routing permissions – To Control Center column; Legal, Finance / Treasury and Intelligence Officer noted as not routing | ✅ |
| Routing permissions – choose which states State IRS can route to (any other state, or chosen states) | ✅ |
| Routing permissions – loading and empty (no routes set up yet) | ✅ |
| Routing permissions – set up routes flow: choose where to start (draft matrix or from scratch), draft loaded for review, save routes (totals and reason), routes set up | ✅ |
| Audit log – list (search; Users, Action, Record and When filters; time, user, action and record, IP address and device) | ✅ |
| Audit log – filter dropdowns open: Users (search people), Action (types with counts), Record (types with counts), When (today, yesterday, last 7 or 30 days, custom range) | ✅ |
| Audit log – filters applied (Access changes, Reset filters) | ✅ |
| Audit log – loading and empty (no activity recorded yet) | ✅ |
| Audit log – row actions (view entry, show this person's activity, show this record's history, copy entry ID) | ✅ |
| Audit log – person's activity popup (entries by one person; today, last 7 or 30 days; open in audit log) | ✅ |
| Audit log – record history popup (every change to one record with before and after, newest first; open the record) | ✅ |
| Audit entry – detail popup (who, when, record, IP address, device; before and after; permanent) | ✅ |

## 13. Account

| Screen | Status |
|---|---|
| Profile – personal details, your access (role, party, jurisdiction, modules, permissions), sign-in, your activity, appearance | ✅ |
| Profile – editing (unsaved changes) and saved (toast) | ✅ |
| Sign out – confirm dialog | ✅ |
| Password and sign-in – change password (current, new, confirm; password rules) | ✅ |
| Password and sign-in – typing (rule not met, passwords do not match), wrong current password, password updated | ✅ |
| Account – loading (Profile and Password and sign-in) | ✅ |
| Account – empty: new account (optional details not added, no activity yet) | ✅ |

## Prototyping

Not started. Prototype links will be added module by module once the screens
above are designed.
