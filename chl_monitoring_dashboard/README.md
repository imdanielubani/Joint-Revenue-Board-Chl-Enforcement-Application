# CHL Monitoring Dashboard

The web Admin Dashboard for the JRB CHL Enforcement system. Administrators,
supervisors and Principal Officers use it to monitor enforcement activity
recorded by the mobile app and the existing CHL system.

The dashboard is **read-only**: it shows CHL data and never changes it. No
creating accounts, vehicles, tags, tariffs or trip rules; no closing or
cancelling violations; no confirming payments; no editing evidence.

**Stack:** React 19, TypeScript (strict), Vite, React Router, TanStack Query,
zod, CSS Modules, Vitest with Testing Library, oxlint, Prettier. Node.js 24.

## Contents

1. [Getting started](#getting-started)
2. [Commands](#commands)
3. [Configuration](#configuration)
4. [Project structure](#project-structure)
5. [Architecture](#architecture)
6. [Sessions and access](#sessions-and-access)
7. [Conventions](#conventions)
8. [Change log](#change-log)

## Getting started

```bash
cd chl_monitoring_dashboard
npm install
npm run dev
```

Open http://localhost:5173. Until the backend is ready, the dashboard runs
on sample data. Sign in with any sample account; the password is
`password` for all of them.

| Email                    | Role              | Sees                                                  |
| ------------------------ | ----------------- | ----------------------------------------------------- |
| `admin@jrb.gov.ng`       | Administrator     | Every module, nationally                              |
| `supervisor@jrb.gov.ng`  | Supervisor        | Every module except the audit trail; Lagos            |
| `po@jrb.gov.ng`          | Principal Officer | Six modules; Ikeja LGA                                |
| `deactivated@jrb.gov.ng` | —                 | Refused: shows the "Account deactivated" notification |

## Commands

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Starts the dev server with hot reload                         |
| `npm run build`     | Type-checks and builds the production bundle to `dist/`       |
| `npm run preview`   | Serves the built bundle locally                               |
| `npm run typecheck` | Type-checks only                                              |
| `npm run lint`      | Lints with oxlint                                             |
| `npm run format`    | Formats every file with Prettier (`format:check` only checks) |
| `npm test`          | Runs the tests once (`npm run test:watch` keeps watching)     |
| `npm run check`     | Lint, formatting, tests and build: run before committing      |

## Configuration

Settings are read from `VITE_` variables and checked at start-up in
`src/config/env.ts`. Copy `.env.example` to `.env.local` (ignored by git).

| Setting             | Default       | Meaning                                                 |
| ------------------- | ------------- | ------------------------------------------------------- |
| `VITE_APP_ENV`      | `development` | `development`, `staging` or `production`                |
| `VITE_USE_MOCKS`    | `true`        | Run on the sample data in `src/mocks/`                  |
| `VITE_API_BASE_URL` | empty         | The backend's address; required when sample data is off |

The dashboard refuses to start if production is set to sample data, if
sample data is off without a backend address, if staging or production
use `http` instead of `https`. Outside production, the top bar shows the
environment, and "Sample data" while it is on.

## Project structure

The code is organised by feature: each module of the dashboard has its own
folder in `src/features/`.

```
src/
  main.tsx                 Entry point: mounts the app, loads the global styles
  app/                     Puts the app together
    App.tsx                Providers and the router
    AppProviders.tsx       Query cache and session (tests pass their own)
    routes.tsx             Every route; each module loads as its own bundle
    modules.ts             The modules: key, menu label, page title, address, section, icon
    layout/                The signed-in frame: AppShell, Sidebar, Topbar, AccountMenu,
                           page titles (page-meta.ts)
    pages/                 Home redirect, not found, crash page
  config/
    env.ts                 Settings, checked with zod at start-up
    paths.ts               Every route's address
  features/                One folder per module
    auth/                  Sign-in, sign-in help, CHL support, profile, the 24-hour
                           session, route guards
    overview/              The Overview: headline figures, charts, registers, recent activity
    command-centre/        Activity feed, cases needing attention, field reports
    geography/             Point, zone, ward, LGA, state, region, subregion, national
    agents/                Each agent's verifications, violations and follow-up
    verifications/         RFID, QR and plate verifications; E-Tag results
    trips/                 CHL trip details (read-only)
    violations/            Violation register, categories, statuses, history
    evidence/              Photograph viewer and enforcement notes
    payments/              Demand notices, payment status, compliance
    notifications/         Repeat-vehicle alerts, field and enforcement notices
    audit/                 Verification history and the audit trail
    sync/                  Synchronisation and field status
  shared/                  Used by every feature; imports no feature
    api/                   HTTP client, ApiError, query cache settings, auth bridge
    lib/                   Lagos-time dates and formatting, chart scales, CSV export,
                           record-register search/sort/pages, safe storage
    ui/                    PageHeader, StatePanel, DashboardCard, SegmentedTabs,
                           StatusLabel, RegisterTable, RowActions, NoAccess, placeholders
  mocks/                   Sample data and sample APIs, used until the backend is ready
  styles/
    tokens.css             Design tokens: colours, type, spacing, radii
    global.css             Reset and base styles
  test/                    Test setup and helpers (renderApp, signInAs)
```

**Inside a feature folder**, as the module grows:

| Path                   | Holds                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `pages/`               | The module's screens, one component per route                  |
| `components/`          | Components only this module uses                               |
| `<feature>.api.ts`     | Calls to the backend, with the sample-data version beside it   |
| `<feature>.schemas.ts` | zod schemas for the backend's answers, and the types from them |
| `<feature>.queries.ts` | TanStack Query hooks and query keys                            |
| `*.test.ts(x)`         | Tests, next to the code they test                              |

## Architecture

```
page → feature hooks (<feature>.queries.ts) → <feature>.api.ts
                                             → shared/api/http-client.ts → backend
                                             → src/mocks (while VITE_USE_MOCKS=true)
```

- **Dependencies point inwards.** `app/` uses features, features use
  `shared/` and `config/`, and `shared/` uses neither. A feature never
  imports another feature's internals.
- **One API layer per feature.** Screens never call `fetch`. Each feature's
  API module picks the backend or the sample data, so connecting the backend
  changes only that module.
- **Every answer is checked.** The HTTP client checks the backend's answer
  against a zod schema, so a screen never renders data in a shape it
  doesn't expect.
- **Errors:** a failure is an `ApiError` with a status, a stable code and a
  message. Status 0 means the backend couldn't be reached; a screen must
  show that as "unavailable", never as a result such as "No Active Trip".
- **Server data lives in TanStack Query**, not in component state. Queries
  retry network and server errors twice, never a 4xx.
- **Every data screen** shows loading, empty, error and "last updated"
  states (`StatePanel`, `LastUpdated`).
- **Notifications:** `useToast().showToast({ title, lines })` shows the
  design's notification in the top-right corner (`shared/ui/toast/`).
  - `variant: 'success'` (default, green): dismisses itself after 6 seconds
    or with its close button; announced politely.
  - `variant: 'warning'` (amber): stays until dismissed; announced
    politely.
  - `variant: 'error'` (red): stays until dismissed; announced at once.
  - Success sits 36px from the top and 32px from the right; warning and
    error sit 41px and 34px, as their designs place them.
  - `icon`: `check` (success default), `clock` (warning default),
    `warning` (error default) or `account`.
  - `action: { label, to }` adds a link under the text; `action: { label,
onSelect }` (no `to`) is a button acting on the current page. Either
    dismisses the notification. `key` replaces an earlier notification with
    the same key instead of stacking another, and `dismissToast(key)`
    removes it.
  - The provider sits in the root route, inside the router, so actions can
    be links and notifications survive page changes.
- **Times are shown in Lagos time** (`shared/lib/format.ts`), whatever the
  viewer's clock.
- **Styling:** CSS Modules next to each component; every value comes from
  the tokens in `styles/tokens.css`, which hold the design's colours, type,
  radii and sizes. Fonts are self-hosted (`styles/fonts.ts`): Poppins for
  text, Geist for inputs, Inter for captions.
- **The signed-in frame** (`app/layout/`), as designed:
  - **Sidebar:** the brand, the workspace card (from the user's areas), the
    menu in three sections (Workspace, Enforcement, Monitoring) with the
    current page highlighted, a marker on "Violations & cases" when cases need
    attention and the unread count on "Notifications", then Log out and the
    user (opening the account menu). The top bar's arrow collapses it to
    icons (80px); the choice is remembered in this browser. On screens 768px
    or narrower it slides over the page instead.
  - **Top bar:** the page's icon, breadcrumb and title (the page's `h1`), a
    search of all records (to `/search`), Help (CHL support), the bell with
    the unread count, and the profile, which opens the account menu (Profile,
    Settings, Log out; keyboard: arrows, Home, End, Escape).
  - Menu icons use the design's SVGs as masks (`MaskIcon`), so one file
    serves the active, inactive and top-bar colours.
  - The counts come from `features/notifications` and `features/violations`
    (sample data until the backend is connected), refreshed every minute.
  - Settings and search results are placeholders until they are designed.
- **Images** from the design live in `public/assets/` (`brand/` for the
  JRB logo, `auth/` for the sign-in pages, `support/` for the support form,
  `toast/` for notifications, `shell/` for the top bar and sidebar, `nav/`
  for the menu). They are served as they are, so
  code refers to them by URL with `assetUrl('brand/jrb-logo.png')`
  (`shared/lib/asset-url.ts`), never by importing them.
- **Favicon:** the JRB shield mark, cropped from the brand logo, in
  `public/`: `favicon.ico` (16, 32 and 48 px), `favicon-16x16.png`,
  `favicon-32x32.png`, and `apple-touch-icon.png` (180 px, on white, for
  phone home screens). They are linked from `index.html`. To change them,
  regenerate all four from the logo.

## Sessions and access

- Sign-in goes through the existing CHL authentication, via the backend.
- **Inactivity: signed out after 45 minutes** without a click, key press,
  scroll or mouse movement, in any tab (tabs share the last activity, so
  working in one keeps the others signed in). Two minutes before, an amber
  "Are you still there?" notification offers "Stay signed in"; any activity
  also removes it. Time away with the browser closed counts too, even with
  "Keep me signed in". Background data refreshes do not count as activity.
  The sign-in page then shows "Session expired" with "You were signed out
  after a period of inactivity."
- **Five minutes before the 24 hours end**, an amber "Session expiring"
  notification says so; it offers no action, since the 24 hours cannot be
  extended.
- The times are in `DEFAULT_SESSION_POLICY` (`features/auth/session-policy.ts`);
  the session is checked every second.
- **A session lasts 24 hours from sign-in**, like the mobile app's. Renewing
  the access token doesn't extend it. When it ends (or the backend refuses
  a renewal), the user is taken to the sign-in page, which shows the amber
  "Session expired" notification once. Its "Sign in again" puts the cursor
  in the form (email, or password if the email is filled) rather than
  reloading the page, so after signing in the user returns to the page
  they were on.
- On a 401, the HTTP client renews the access token once (one renewal at a
  time, however many requests failed) and retries. If renewal fails, the
  session ends.
- **"Keep me signed in"** keeps the session after the browser is closed
  (`localStorage`). Unticked, the session ends with the browser tab
  (`sessionStorage`). Either way it ends at 24 hours, and survives reloads.
- Signing in or out in one tab applies to the others. Signing out clears
  every cached answer.
- **Signing out** (`useSignOut()` in `features/auth/use-sign-out.ts`, used
  by the top bar) ends the session at once, shows the "Logged out
  successfully" notification over the sign-in page, then tells the backend;
  the notification never waits for the backend. A session that expires
  shows "Session expired" instead.
- **Modules:** the backend says which modules each user may open
  (`user.modules`). The menu shows only those, and opening another one shows
  "No access". **Areas:** the user's areas (`user.scopes`) come from CHL;
  the backend filters the data to them.
- Pending with the backend: the auth paths in `features/auth/auth.api.ts`
  are provisional. Tokens are kept in browser storage for now; if the
  backend can use httpOnly cookies, they should move there.
- **Failed sign-in** shows the red "Sign-in error" notification with a
  "Get sign-in help" link (to `/forgot-password`), not a message in the
  form. Wrong details (`invalid_credentials`, HTTP 401) get the design's
  wording, "We couldn’t sign you in. Check your details and try again.",
  and a cleared password. Any other failure (no connection, too many
  attempts, a server fault) shows the actual reason and keeps the password.
  A new attempt clears the last attempt's notification, so none is left
  over after signing in.
- **Deactivated accounts:** when sign-in is refused with the code
  `account_deactivated` (HTTP 403, `AUTH_ERROR_CODES`), the sign-in page
  shows the red "Account deactivated" notification with a "Contact CHL
  support" link, clears the password and keeps the email. The backend
  should only say so after the password is right, so the message never
  reveals which accounts exist; the sample data does the same.
- **Passwords are reset in CHL, never in the dashboard.** "Forgotten
  Password?" and "Need help signing in?" on the sign-in page open the
  sign-in help page (`/forgot-password`), which explains this and offers
  "Contact CHL Support".
- **CHL support** (`/support`): a signed-out form (full name, CHL email
  address, issue type, message of up to 2000 characters, all required) that
  sends the request to CHL support by email through the backend
  (`features/auth/support.api.ts`; the path is provisional). On success the
  form clears and an "Email sent" notification appears. On sample data the
  notification adds "Success preview only — no email has been sent.", which
  is true there. A failure keeps what was typed and says why.
- **Issue types** (`ISSUE_TYPES` in `features/auth/support.schemas.ts`): Can’t
  sign in (`cant_sign_in`), Account locked (`account_locked`), Wrong access
  (`wrong_access`), Something else (`other`). The backend receives the key;
  to add a type, add its key and label there.

## Conventions

- TypeScript strict; no `any` without a reason.
- Components are `PascalCase.tsx`; other files are `kebab-case.ts`. Named
  exports only.
- A new module: add its key to `MODULE_KEYS`, its address to `paths`, an
  entry to `MODULES`, its page to `MODULE_PAGES` in `routes.tsx`, and a
  folder in `features/`.
- Run `npm run check` before committing.
- Commit and push to `main` after each change; update this README and its
  change log in the same commit.

## Change log

Newest first. Add a line for every change.

- Overview: the area control lists every area within the user's own, from
  CHL's area tree (region, subregion, state, LGA, ward, zone, enforcement
  point), indented by level and searchable. The choice is kept in the address;
  an area the user may not see is ignored. On a single enforcement point the
  performance card shows agents only. Sample area tree in
  `mocks/mock-areas-api.ts`; backend path `/api/v1/areas` (provisional).
- Overview: each recent-activity record says whether CHL answered it live or
  the phone checked it offline, how much later an offline record reached CHL,
  and its sync status (Synced, Evidence pending). Search finds "offline", and
  the export includes these columns.
- Overview: the Cancelled case status is shown, and statuses, results and
  methods the dashboard does not know yet (ones CHL adds later) show as they
  come, as a grey label, instead of stopping the page from loading.
- Overview page built to the design: banner with Refresh and Export records,
  area and period filters (kept in the address), the summary strip, eight
  headline figures, the daily verification chart, verification outcomes,
  enforcement performance by agent, location or organization, verification
  methods, violations by category, payment status, activity by location,
  cases requiring attention, repeat-vehicle alerts and the recent activity
  register.
  - Shared building blocks for the module screens: monitoring card, segmented
    tabs, status labels, and a record register with search, sortable columns,
    pages and a row menu.
  - Figures link into their modules only for users who may open them.
  - Sample data matches the design; the backend path is `/api/v1/overview`
    (provisional). Export records saves the period's records as CSV.
  - Inter 500/600/700 added for the monitoring cards.

- Sidebar, top bar and account menu built to the design (expanded,
  collapsed, and menu open), replacing the provisional frame.
  - Modules renamed and regrouped as in the design (Workspace, Enforcement,
    Monitoring); the Overview's title is "Operational overview".
  - Unread notifications and cases needing attention, from the API layer.
  - New Settings and search results pages (placeholders); CHL support is
    reachable while signed in, with "Back to dashboard".
  - Notifications on signed-in pages start under the top bar. "System
    Administrator" is the administrator's role label. Manrope added for the
    sidebar's section labels. 90 tests.

- Inactivity timeout and session warnings.
  - Signed out after 45 minutes without activity in any tab, with an "Are
    you still there?" warning and "Stay signed in" 2 minutes before.
  - "Session expiring" warning 5 minutes before the 24-hour end.
  - The session is now checked every second against one policy
    (`session-policy.ts`), replacing the single 24-hour timer.
  - Tests wait up to 3s for elements and 15s per test, since pages load on
    first use; flaky waits in the session tests were fixed. 71 tests.

- "Session expired" notification built to the design, replacing the
  message inside the sign-in form; shown once when a session runs out.
  - "Sign in again" puts the cursor in the sign-in form and keeps the page
    to return to after signing in.
  - Notifications gained an amber `warning` variant (clock icon, stays until
    dismissed) and on-page button actions; warning and error notifications
    sit 41px from the top and 34px from the right, as designed.
  - The unused notice style was removed. 59 tests.

- "Sign-in error" notification built to the design, replacing the error
  message inside the sign-in form.
  - Wrong details use the design's wording and clear the password; other
    failures say what happened and keep it.
  - Notifications gained per-notification icons (the new warning icon is
    the error default) and `dismissToast(key)`; a new attempt clears the
    last one's notification.
  - The unused form alert style was removed. 53 tests.

- "Logged out successfully" notification built to the design, shown when
  the user signs out (`useSignOut()`), at once and without waiting for the
  backend. 50 tests.

- "Account deactivated" notification built to the design: shown on sign-in
  for a deactivated CHL account, with "Contact CHL support" leading to the
  support page.
  - The notification system gained a red error variant (stays until
    dismissed, announced at once), an action link and replace-by-key; it
    moved into the root route so its links work.
  - Sample account `deactivated@jrb.gov.ng` to try it. 49 tests.

- CHL support: "Issue type" is now a dropdown (Can’t sign in, Account
  locked, Wrong access, Something else) instead of free text, and its label
  reads "Issue type". 43 tests.

- CHL support page built to the design ("How can we help?"), opened by
  "Contact CHL Support" on the sign-in help page.
  - Full name, CHL email address, issue type and message (with a 0/2000
    counter and a message box that grows from 112 to 280 px); every field
    checked before sending; Submit with the send icon.
  - "Email sent" notification as designed, from a new shared toast system
    (`shared/ui/toast/`); on sample data it says no email was sent.
  - Replaces the `VITE_SUPPORT_URL` setting, now removed.
  - The signed-out frame is split into `AuthShell` and `AuthLayout`;
    "Back to sign in" is one shared component. Poppins Bold added.
  - 42 tests.

- Sign-in help page built to the design ("Get Sign-in help"): back link,
  the explanation that passwords are reset through CHL, "Contact CHL
  Support", the role note and "Need help signing in?".
  - It replaces the provisional password-reset form; the unused
    `requestPasswordReset` call was removed from the API layer.
  - New setting `VITE_SUPPORT_URL` for "Contact CHL Support" (required in
    production).
  - "Need help signing in?" on the sign-in page now opens this page; the
    role note and help link are one shared component (`AuthHelp`).
  - 38 tests.

- The favicon is now the JRB shield mark (`.ico` plus 16 and 32 px PNGs and
  a 180 px Apple touch icon), replacing the Vite logo; the browser theme
  colour is the brand green.

- Moved the images to `public/assets/`, referenced through `assetUrl()`.
  The email field's placeholder is now "Enter Your Email Address".

- Sign-in page built to the design: the brand panel (logo, hero, dotted map)
  and the form panel ("Welcome back", email, password with Show/Hide, "Keep
  me signed in", "Forgotten Password?", the role note and "Need help signing
  in?").
  - Design tokens now hold the design's values; Poppins, Geist and Inter are
    self-hosted.
  - "Keep me signed in" chooses between keeping the session after the
    browser closes and ending it with the tab; the 24-hour limit applies
    either way.
  - The forgotten-password page uses the same layout until its design
    arrives. Narrow screens show the form alone.
  - 29 tests.

- Project structure: one folder per module in `src/features/`, with
  `app/`, `config/`, `shared/`, `mocks/` and `styles/`.
  - Routing (React Router) with each module loaded on first use, a sidebar
    built from the user's allowed modules, and a top bar.
  - Sign-in, forgot password and a read-only profile, on sample accounts.
  - 24-hour session: remembered across reloads, renewed on a 401, ended at
    24 hours, shared across tabs.
  - HTTP client that checks answers with zod; TanStack Query for server
    data; checked `VITE_` settings.
  - Shared loading, empty, error and last-updated states; design tokens.
  - Prettier and Vitest; `npm run check` runs lint, formatting, tests and
    build. 22 tests.
  - Removed the Vite starter page.
- Installed React 19 with Vite and TypeScript (oxlint for linting); added
  `typecheck` and `check` scripts, `.nvmrc` and the Node 24 requirement.
