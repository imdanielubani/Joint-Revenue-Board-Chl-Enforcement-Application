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

| Email                   | Role              | Sees                                       |
| ----------------------- | ----------------- | ------------------------------------------ |
| `admin@jrb.gov.ng`      | Administrator     | Every module, nationally                   |
| `supervisor@jrb.gov.ng` | Supervisor        | Every module except the audit trail; Lagos |
| `po@jrb.gov.ng`         | Principal Officer | Six modules; Ikeja LGA                     |

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

| Setting             | Default       | Meaning                                                                                              |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `VITE_APP_ENV`      | `development` | `development`, `staging` or `production`                                                             |
| `VITE_USE_MOCKS`    | `true`        | Run on the sample data in `src/mocks/`                                                               |
| `VITE_API_BASE_URL` | empty         | The backend's address; required when sample data is off                                              |
| `VITE_SUPPORT_URL`  | empty         | Where "Contact CHL Support" leads: an `https://` page or a `mailto:` address; required in production |

The dashboard refuses to start if production is set to sample data, if
sample data is off without a backend address, if staging or production
use `http` instead of `https`, or if production has no support contact. Outside production, the top bar shows the
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
    modules.ts             The modules: key, menu label, address, menu section
    layout/                The signed-in frame: AppShell, Sidebar, Topbar
    pages/                 Home redirect, not found, crash page
  config/
    env.ts                 Settings, checked with zod at start-up
    paths.ts               Every route's address
  features/                One folder per module
    auth/                  Sign-in, sign-in help, profile, the 24-hour
                           session, route guards
    overview/              Summary figures and recent activity
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
    lib/                   Lagos-time and number formatting, safe storage
    ui/                    PageHeader, StatePanel, LastUpdated, NoAccess, placeholders
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
- **Times are shown in Lagos time** (`shared/lib/format.ts`), whatever the
  viewer's clock.
- **Styling:** CSS Modules next to each component; every value comes from
  the tokens in `styles/tokens.css`, which hold the design's colours, type,
  radii and sizes. Fonts are self-hosted (`styles/fonts.ts`): Poppins for
  text, Geist for inputs, Inter for captions.
- **Images** from the design live in `public/assets/` (`brand/` for the
  JRB logo, `auth/` for the sign-in pages). They are served as they are, so
  code refers to them by URL with `assetUrl('brand/jrb-logo.png')`
  (`shared/lib/asset-url.ts`), never by importing them.
- **Favicon:** the JRB shield mark, cropped from the brand logo, in
  `public/`: `favicon.ico` (16, 32 and 48 px), `favicon-16x16.png`,
  `favicon-32x32.png`, and `apple-touch-icon.png` (180 px, on white, for
  phone home screens). They are linked from `index.html`. To change them,
  regenerate all four from the logo.

## Sessions and access

- Sign-in goes through the existing CHL authentication, via the backend.
- **A session lasts 24 hours from sign-in**, like the mobile app's. Renewing
  the access token doesn't extend it. When it ends, the user is signed out
  and the sign-in page says so.
- On a 401, the HTTP client renews the access token once (one renewal at a
  time, however many requests failed) and retries. If renewal fails, the
  session ends.
- **"Keep me signed in"** keeps the session after the browser is closed
  (`localStorage`). Unticked, the session ends with the browser tab
  (`sessionStorage`). Either way it ends at 24 hours, and survives reloads.
- Signing in or out in one tab applies to the others. Signing out clears
  every cached answer.
- **Modules:** the backend says which modules each user may open
  (`user.modules`). The menu shows only those, and opening another one shows
  "No access". **Areas:** the user's areas (`user.scopes`) come from CHL;
  the backend filters the data to them.
- Pending with the backend: the auth paths in `features/auth/auth.api.ts`
  are provisional. Tokens are kept in browser storage for now; if the
  backend can use httpOnly cookies, they should move there.
- **Passwords are reset in CHL, never in the dashboard.** "Forgotten
  Password?" and "Need help signing in?" on the sign-in page open the
  sign-in help page (`/forgot-password`), which explains this and offers
  "Contact CHL Support" (`VITE_SUPPORT_URL`: a page opens in a new tab, an
  email address opens the mail app). Until it is set, the button says the
  support contact hasn't been set up yet.

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
