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

| Setting                | Default         | Meaning                                                 |
| ---------------------- | --------------- | ------------------------------------------------------- |
| `VITE_APP_ENV`         | `development`   | `development`, `staging` or `production`                |
| `VITE_USE_MOCKS`       | `true`          | Run on the sample data in `src/mocks/`                  |
| `VITE_API_BASE_URL`    | empty           | The backend's address; required when sample data is off |
| `VITE_MAP_TILE_URL`    | OpenStreetMap   | Map tiles for the Command centre (https, `{z}/{x}/{y}`) |
| `VITE_MAP_ATTRIBUTION` | OpenStreetMap's | The credit the tile provider requires, shown on the map |

The dashboard refuses to start if production is set to sample data, if
sample data is off without a backend address, if staging or production
use `http` instead of `https`, or if the map tile address is not an
`https` address with `{z}`, `{x}` and `{y}`. Outside production, the top bar
shows the environment, and "Sample data" while it is on.

OpenStreetMap's own tiles suit development and light use only; for production,
set a tile provider JRB has an agreement with, and its credit. An empty
`VITE_MAP_TILE_URL` turns the map off; the list of locations remains.

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
    ui/                    PageHero, FilterBar, FreshnessLine, SummaryStrip,
                           HeadlineFigures, DashboardCard, SegmentedTabs, StatusLabel,
                           RegisterTable, RowActions, StatePanel, NoAccess, placeholders
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

- Agents & organizations: the chosen agent's activity by location (the
  enforcement points they recorded at on the map, with the GPS recorded with
  their verifications under "Event GPS", and a list of those locations with
  their counts and last activity) and follow-up monitoring (their unresolved
  and escalated cases, and repeat-vehicle alerts for vehicles they reported),
  with links to the full lists narrowed to the area and the agent. The
  Overview's cases and repeat-vehicle cards and the geography footprint map
  now take a title and an agent; the map shows "Selected" in its legend only
  where a location can be chosen.
- Agents & organizations: the chosen agent's verification activity (every
  result with its count, each one a filter, and the agent's verification
  records with method, result, time, sync status and recorded GPS) and
  enforcement activity (violations issued with a count per action status,
  demand notices with payment and trip activation kept apart, and evidence
  submitted). Any record opens its details on the page. The underlying-record
  columns are now shared with geographical monitoring
  (`geography/components/record-columns.tsx`), with the agent column left
  out on an agent's own records.
- Agents & organizations page (SRD 5): area, period, organization and
  agent filters as on the Overview; headline figures for the agents in view;
  an agent register with each agent's ID, name, organization, the scope CHL
  assigns them ("Not exposed by CHL" where it exposes none) and their
  recorded verifications, violations, unresolved cases and last activity,
  listed by agent ID and never ranked; an organizations summary that narrows
  the page to one organization. Choosing an agent (or opening
  `/agents?agent=…`) shows their identity and a performance overview of the
  documented metrics: verifications, violations issued, evidence submitted,
  demand notices, unresolved cases, repeat alerts, trip activation and
  locations. No scores, rankings, attendance, shifts or payroll; the module
  never creates or administers agent accounts.
- Agents & organizations data: each agent the user may see in an area, with
  their identity, the scope CHL assigns them (or none where CHL does not
  expose it) and the documented metrics for the period (verifications and
  their results, violations issued, evidence submitted, demand notices,
  unresolved and escalated cases, repeat alerts, locations), plus one agent's
  records, locations, unresolved cases and repeat-vehicle alerts. Counts only,
  never scores or rankings. Sample data is counted from the same records as
  the Overview (`mocks/mock-agents-api.ts`); backend paths
  `/api/v1/agents/monitoring` and `/api/v1/agents/{id}/activity`
  (provisional). The sample agent list moved to `mocks/mock-agent-list.ts`.
- Geographical monitoring's Enforcement follow-up and Payment follow-up
  cards now use the Overview's Cases requiring attention and Payment status
  cards, narrowed to the chosen area: the unresolved / escalated tabs and
  case list, then the repeat-alert reminder; the received / pending figures,
  then the latest linked demand notices. No Active Trip is shown in blue
  rather than red wherever verification results appear.
- E-Tag Missing and Invalid E-Tag verification results have their own
  icons (a tag struck through; a tag with a cross) in place of a plain dash,
  in every register and card that shows verification results.
- Geographical monitoring: the verification register's method column
  matches the Overview's: headed "Verification method", each method as the
  same small outlined tag, and "Not supplied" where the device gave none.
- Geographical monitoring: the Agent activity card is removed; agent
  activity stays in the Agents tab of Underlying records. In the
  verification register the plate column shows the plate alone, and the
  outcome column is headed "Verification result".
- Geographical monitoring keeps to the document's features: "Locations in
  view" names the current scope without repeating its figures, and the
  agent tiles no longer show each agent's share of the scope's
  verifications.
- Geographical monitoring: an Agent activity card (SRD 4, "agent
  activity"): agents with activity, organizations, verifications and
  violations for the scope, then a tile per agent (by recorded agent ID)
  with their verifications, violations, unresolved cases and repeat alerts,
  their share of the scope's verifications and where they recorded activity,
  linking to the agent where the role allows. Activity only: no scores or
  rankings.
- Sample data: a centrally defined subregion, Lagos Metropolitan (in South
  West, holding Lagos), so the Subregion view of geographical monitoring
  shows its activity. Lagos's place in the sample area tree moves under it;
  the page itself assumes no hierarchy.
- Geographical monitoring: access to the underlying records on the page
  itself (SRD 4). Every record's reference or name in the Underlying records
  registers opens a Record details panel: everything known about it, what it
  is linked to (a verification's violation, a violation's demand notice and
  photographs, a notice's trip activation) and links into the modules where
  the user's role allows. A new Evidence tab lists the photographs supplied
  with each violation, how many, and whether they have all reached CHL.
  The API's records gain `evidence`, and violations their
  `verificationReference`.
- Geographical monitoring: recorded GPS for each event (SRD 4, "recorded GPS
  positions"). Verifications and violations carry the GPS their device
  captured (`position`, or null when none was captured), shown in the
  verification register's "Recorded GPS" column and under each violation's
  recorded time. "Event GPS" on the enforcement footprint adds each
  verification's recorded position to the map as a small hollow dot, labelled
  with its reference, outcome and time. Choosing an enforcement location zooms
  the map to it. Recorded positions, never continuous tracking.
- Geographical monitoring: the E-Tag column is removed from the
  verification register, and the `etag` field with it from the geography
  API. E-Tag outcomes (missing, invalid, tag-vehicle mismatch) still show as
  verification outcomes.
- Geographical monitoring laid out as in its design, in our own components
  (SRD 4): four headline figures (verifications, agents with activity,
  unresolved cases, repeat-vehicle alerts); Monitoring scope, "eight views of
  the same enforcement records, not a geographical hierarchy" — National,
  Region, Subregion, State, Local Government Area, Ward, Enforcement Zone and
  Enforcement Location, each with the areas CHL configures at that level and
  the record window; Enforcement footprint (the map, sized by verifications
  or violations, with Fit locations; the selected location in amber) beside
  Locations in view (the current scope's figures and a searchable list; at
  Enforcement Location level every permitted location stays listed);
  Verification outcomes, Enforcement follow-up and Payment follow-up; and
  Underlying records, a register for each of verifications, agents,
  violations, unresolved, escalated, repeat alerts, payments and locations.
  No parent-child hierarchy is assumed, so the "Areas within" table and the
  scope trail are gone, and the API's `areas` with them; it gains
  `records` (the scope's verifications with E-Tag results, violations and
  demand notices for the period).
- Geographical monitoring follows the document (SRD 4) rather than repeating
  the Overview. A Monitoring scope card offers the eight scopes in the
  document's order (enforcement location, enforcement zone, ward, LGA,
  state, region, subregion, national), each listing the areas CHL
  configures at that level within the user's areas, with the area each sits
  under; national visibility is for authorized users only. "Activity in …"
  shows the eight features the document lists for every scope: verification
  totals and outcomes, agent activity, violations issued, unresolved and
  escalated cases, repeat-vehicle alerts, related payment / compliance
  status, enforcement locations and recorded GPS positions (the map below),
  and access to the underlying records (scoped links, as the user's role
  allows). The "Areas within" table keeps the parent-child view from CHL's
  configuration. Removed: the Overview's headline figures, outcomes,
  performance, cases, repeat-vehicle and payment cards, the record register
  and the area picker (the scope card replaces it). The Overview's period
  control is shared as `PeriodFilter`.
- Geographical monitoring page built (SRD 4), in the Overview's design and
  with its own map icon on the banner. One area at a time, at any level CHL
  configures (enforcement point, zone, ward, LGA, state, subregion, region,
  national), chosen with the area picker, from the "Areas within" table, the
  map or the scope trail (National › South West region › Lagos state › …),
  and kept in the address with the period. For that area: verification
  totals and outcomes, agent activity, violations issued, unresolved and
  escalated cases, repeat-vehicle alerts, payment and compliance status,
  enforcement locations at their recorded GPS positions (map or list, not
  live tracking), and the record register, with figures linking to the
  records. The "Areas within" table lists the areas directly under it in
  CHL's configuration with the same figures. The views are of the same data
  as the Overview, so the figures agree. The summary strip's line can now
  hold more than text.
- The map of enforcement points moves to `features/geography` as
  `EnforcementMap`, shared by the Command centre and geographical
  monitoring: each page gives its points (one figure each), how that figure
  reads, the legend, and the panel's action and link. Busiest points are
  drawn first, so smaller circles stay clickable on top. Links into
  geographical monitoring now name the enforcement point as the scope
  (`/geography?scope=…`), as points are areas in CHL's tree.
- Geographical monitoring data (SRD 4): for an area and period, the areas
  directly under it in CHL's area tree, each with the same figures as the
  area itself (verifications and outcomes, agents, violations, unresolved
  and escalated cases, repeat-vehicle alerts, payments, enforcement points),
  and every enforcement point in scope with its recorded GPS position, active
  in the period or not. The parent-child relationships come only from the
  area tree, so levels may differ under one parent (Ikeja holds a ward and an
  enforcement point). Counted with the Overview's own counting in
  `mocks/mock-geography-api.ts`; backend path `/api/v1/geography`
  (provisional).
- Each page banner shows its own module's icon, as the Overview does with
  its grid: the large faint mark and the small icon before "JRB CHL /". The
  Command centre's is its compass. `PageHero` takes the folder holding the
  module's `hero-watermark.svg` and `hero-crumb.svg`.
- Command centre:
  - SOS: each notification shows how long it has been open ("Open for
    2 h 10 min", counting up while the page is open) or how long it was open
    before it closed ("Closed after 48 min"). The alert above the feed and
    the incident context say the same. The card lists up to ten, open ones
    first, and the sample data has ten in the last day (three still open).
    The API's SOS details gain `closedAt`.
  - Operational boundaries is laid out as two labelled groups, "What it
    does" and "What it does not do", with each icon in a box in one column
    and a line between rows.
  - New `formatDuration` ("1 h 20 min") and `useNow` (a clock for figures
    that count up).
- Command centre: the incident context is arranged as in the design. A
  summary block shows what the entry is, its vehicle (or what happened, where
  there is none) and its status. Below it, the facts are listed one under
  another: agent, location, recorded and received times, how it was checked,
  related case, demand notice, evidence (with a link to view the photographs)
  and the agent's note. The record it belongs to opens from the card's foot.
  An Operational boundaries card under it lists what the Command centre does
  and does not do (SRD 3), replacing the note at the foot of the page. The
  two cards together match the feed's height. A verification now shows the
  same photographs as the violation it led to. Card subtitles are optional.
- Command centre:
  - Clicking a circle on the map opens a panel for that enforcement point:
    its entries in the window, when it last recorded something, a reminder
    that positions are recorded ones, "Show its entries in the feed" and, for
    users who may open it, "Open in geographical monitoring". "Show its
    entries" narrows the feed to that point (with "Show all locations" to
    undo), shows its latest entry in the incident context and scrolls to the
    feed. The panel opens at the circle's centre and stays open across the
    30-second refresh.
  - SOS monitoring has its own full-width row under the feed, with
    notifications side by side.
  - The activity feed and the incident context are always the same height;
    the feed's list takes any extra height.
- Command centre: the Recorded locations card shows a map by default (SRD 3,
  location-based view), with a List tab for the tiles. Each enforcement point
  is a circle at the GPS where its events were recorded, larger where more was
  received in the window and grey where nothing was; hovering shows its name,
  code, entries and when it last recorded something. The view fits the chosen
  area and keeps the user's pan and zoom across refreshes. Positions are of
  recorded events, never live ones. Built with Leaflet 1.9.4, loaded only when
  the map is shown. New settings `VITE_MAP_TILE_URL` and
  `VITE_MAP_ATTRIBUTION` (OpenStreetMap by default; empty turns the map off).
  The API's locations gain `position` (latitude and longitude, or null).
- Command centre: SOS monitoring (SRD 3), for SOS notifications agents send,
  where the backend exposes them. While any SOS is open, a red line above the
  feed names the latest, with "Show details". The SOS card beside the feed
  lists open notifications first, then any received in the window, with the
  agent, their message, where it was sent and when CHL received it. SOS
  entries also appear in the feed and the incident context, where the location
  is marked as where the SOS was sent, not a live position. The dashboard only
  shows them; responding happens outside it. When the API returns `sos: null`
  the card says CHL does not provide SOS notifications yet. Sample SOS
  notifications in `mocks/mock-field-reports.ts`.
- Command centre: a Loaded / empty reports card (SRD 3), showing agents'
  haulage-loaded or empty status where recorded. It has a loaded-to-empty bar,
  All / Loaded / Empty tabs, and the latest reports with vehicle, agent,
  location and when CHL received them; choosing one shows it in the incident
  context. The Field reports card now counts reports by type (vehicle, driver,
  situation, general notification). Both cards have their own lists from the
  API (`fieldReports`, `loadReports`), so the feed's 150-entry limit never
  hides a report.
- Command centre: the time window and the feed's order go by when CHL
  received each entry (SRD 3, "received by CHL"). A record made offline
  earlier and synced a minute ago appears as new activity, with its earlier
  recorded time shown under the received time. Activity by location counts
  entries received in the window; "last recorded" is still when the latest
  event happened there.
- Command centre page built in the Overview's design: banner with Refresh;
  area and time-window filters (kept in the address) with the field-data
  freshness line; the summary strip; four headline figures (activity
  received, cases needing attention, escalated cases, repeat vehicles without
  follow-up); the operational activity feed, with tabs for verifications,
  violations, payments and field reports, beside the incident context of the
  chosen entry (vehicle, agent, location, recorded and received times, live or
  offline, violation, demand notice, photographs, the agent's note, and links
  to the records the user may open); cases requiring attention and
  repeat-vehicle alerts; field reports with loaded / empty confirmations; and
  recorded locations. The page monitors only: no dispatch, messaging, device
  control or live tracking. SOS alerts will be added later.
- Command centre data (SRD 3): the operational activity feed (verifications,
  violations, payment updates, field reports and loaded / empty
  confirmations, each with when it was recorded and when CHL received it),
  open cases and repeat-vehicle alerts, and activity by enforcement point.
  Shown for an area and a window ending now (last hour, today, last 24 hours,
  last 7 days) and checked every 30 seconds. Sample field reports in
  `mocks/mock-field-reports.ts`, counted in `mocks/mock-command-centre-api.ts`;
  backend path `/api/v1/command-centre` (provisional).
- Shared page parts, for the Overview and the module screens: the green
  banner and its buttons (`PageHero`), the filter row and its dropdowns
  (`FilterBar`), the field-data freshness line (`FreshnessLine`), the summary
  strip (`SummaryStrip`) and the headline figures (`HeadlineFigures`) move to
  `shared/ui`; the area picker and area options to `features/geography`; the
  module-access link helper to `features/auth`. The Overview looks and
  behaves as before.
- Top bar: it now sits on a frosted band (a blurred, translucent backdrop
  from the top of the window to just below the bar), so the page blurs and
  fades out behind it as it scrolls. The bar and the page keep their places;
  browsers without backdrop blur get a near-solid band instead.
- Overview: the verification-method ring is drawn as one arc path per method
  (`arcPath` in `shared/lib/chart-scale.ts`) instead of dashed circles. It
  looks the same in the browser, and Figma exports now keep it: before, each
  arc lost its offset there and all of them started at twelve o'clock.
- Overview: "E-Tag results" redrawn in the payment card's style, as one
  segmented bar and a one-line-per-result legend (count and share), so the
  method card stays in step with the design and the row is no taller than it
  needs to be. Each result has its own colour (valid green; missing, fake and
  mismatched in distinct warm colours). The chart's tooltip now sits beside
  the day it describes, never over its point or the line.
- Overview: the Verification activity card shows how many attempts completed
  and how many could not (SRD 6.1). An attempt that could not complete is
  Verification Unavailable (CHL could not be reached or answer); it is not a
  failed check, and outcomes are still never summed into pass/fail. Hovering
  explains this. The overview answer gains `attempts`.
- Overview: "E-Tag results" (SRD 6.3) at the foot of the Verification method
  card: Valid E-Tag, Missing E-Tag, Invalid / fake E-Tag and Tag-vehicle
  mismatch, each with its count and share of tag checks and a link to
  Verifications. Kept apart from the outcomes, since a valid tag can still
  have no active trip. The overview answer gains `etagResults`; a result CHL
  adds later shows in grey.
- Sample data: today's sample records now arrive every 20 minutes up to the
  present, so "Field data received" is recent at any time of day (it showed
  "may be delayed" from late morning on).
- Sidebar: the menu no longer shows a scrollbar. On short screens it still
  scrolls with the wheel, touch or keyboard.
- Signing in shows the design's "Login successful" notification ("Welcome
  back. Your monitoring workspace is ready.") over the dashboard it opens on;
  it dismisses itself like other confirmations, and replaces a "Logged out
  successfully" notification still on screen.
- Overview sample data now follows the filters: 90 days of sample field
  records (verifications, the violations they led to, and demand notices) in
  `mocks/mock-records.ts`, from a fixed seed, and every Overview figure is
  counted from the records that match the area, period, organization and
  agent (`summarize` in `mocks/mock-overview-api.ts`). The cards always agree
  with one another; a repeat-vehicle alert needs three qualifying reports.
  The sample agents are now in two organizations (Zone 1, Zone 2) so the
  filter has a choice. The figures differ from the design's placeholder
  numbers, which did not add up.
- Overview: beside "Last checked", the time CHL last received a field record
  for the figures ("Field data received 10:18 WAT"). It turns amber with "may
  be delayed" when that record is more than 2 hours older than the check, and
  says so when no field records came. Hovering explains that offline records
  arrive later. The overview answer gains `latestReceivedAt`.
- Overview: "Custom range" in the period list shows From and To date fields,
  starting from the period on screen. Dates are Lagos days; a pair that is out
  of order, incomplete or in the future is explained under the fields and not
  applied. The dates are kept in the address (nonsense dates fall back to the
  last 14 days), the summary line shows them, and every request now carries the
  period's first and last day. The filter dropdowns are as wide as their
  choice.
- Overview: organization and agent filters in the filter row, kept in the
  address with "Clear" to remove them. Choosing an organization limits the
  agent list (and drops an agent outside it); an agent or organization the
  user cannot see is ignored. The summary line names the filter. Agents are
  matched by recorded ID. Sample agents in `mocks/mock-agents-api.ts`; backend
  path `/api/v1/agents` (provisional). The page's filters now live in
  `use-overview-filters.ts`.
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
