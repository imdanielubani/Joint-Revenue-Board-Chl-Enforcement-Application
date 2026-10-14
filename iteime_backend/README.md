# iteime_backend

The backend of ITEIME, the JRB Enforcement Engine. It connects to the
existing CHL backend and serves the JRB CHL Enforcement mobile app
([`../jbr_chl_enforcement`](../jbr_chl_enforcement/)).

```
Mobile app (MVP)                         ──►  iteime_backend  ──►  Existing CHL backend
ITEIME Admin Dashboard                   ──►  iteime_backend only (its own data)
National Command Center Admin Dashboard  ──►  iteime_backend and the existing CHL backend
```

All vehicle, E-Tag, trip and agent data, and every verification result, come
from the existing CHL backend. iteime_backend reaches CHL only through the
**CHL adapter**, and never duplicates what CHL owns: accounts, vehicles, tag
issuance, tariffs or trip rules.

**Stack:** Node.js 24, Express 5, TypeScript (strict, ESM), PostgreSQL, zod, pino, Vitest.

## Contents

1. [Getting started](#getting-started)
2. [Configuration](#configuration)
3. [Project structure](#project-structure)
4. [Architecture](#architecture)
5. [Documentation](#documentation)
6. [Testing](#testing)
7. [Conventions](#conventions)
8. [Roadmap](#roadmap)
9. [Change log](#change-log)

## Getting started

```sh
cd iteime_backend
npm install
cp .env.example .env    # set DATABASE_URL to your PostgreSQL database
npm run dev             # migrates the database, then http://localhost:4000/health/ready
```

| Script                                           | What it does                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `npm run dev`                                    | Runs `src/server.ts` and restarts on changes                                  |
| `npm run build`                                  | Compiles to `dist/`                                                           |
| `npm start`                                      | Runs the compiled server                                                      |
| `npm run migrate`                                | Brings the database schema up to date (the server also does this at start-up) |
| `npm test`                                       | Runs the tests once (`npm run test:watch` to keep watching)                   |
| `npm run test:unit` / `npm run test:integration` | Only the unit tests / only the database tests                                 |
| `npm run check`                                  | Type-check, lint, formatting and every test: run before committing            |
| `npm run typecheck`                              | Type-checks everything, tests included                                        |
| `npm run lint` / `npm run format`                | ESLint / Prettier                                                             |

## Configuration

Settings come from environment variables (a `.env` file in development; see
[`.env.example`](.env.example)). They are checked at start-up
(`src/config/env.ts`); a wrong value stops the server with a readable message.

| Variable                   | Default                            | Meaning                                                                                                                   |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `development`                      | `development`, `test` or `production`                                                                                     |
| `APP_ENV`                  | `development`                      | Which deployment: `development`, `staging` or `production` (see [deployment](docs/deployment.md))                         |
| `PORT`                     | `4000`                             | HTTP port                                                                                                                 |
| `LOG_LEVEL`                | `info`                             | Pino level (`silent` to turn logs off)                                                                                    |
| `DATABASE_URL`             | —                                  | PostgreSQL connection string (required)                                                                                   |
| `CHL_ADAPTER`              | `mock`                             | `mock` (sample CHL data) or `http` (the real CHL backend)                                                                 |
| `CHL_BASE_URL`             | —                                  | The CHL API address; required when `CHL_ADAPTER=http`                                                                     |
| `CHL_API_KEY`              | —                                  | Server-to-server credential issued by the CHL team                                                                        |
| `CHL_TIMEOUT_MS`           | `10000`                            | How long to wait for CHL before calling it unavailable                                                                    |
| `CHL_MOCK_DELAY_MS`        | `0`                                | Mock only: delay per call, to imitate a network                                                                           |
| `ACCESS_TOKEN_TTL_MINUTES` | `30`                               | How long an access token lasts before the app refreshes it                                                                |
| `SESSION_TTL_HOURS`        | `24`                               | How long a sign-in lasts at most (1–24; SRD §5.3)                                                                         |
| `TEST_DATABASE_URL`        | —                                  | Tests only: a database whose name ends in `_test`, emptied by the tests                                                   |
| `TRUST_PROXY`              | private-network proxies            | Which proxies' `X-Forwarded-For` to believe: a hop count (`1` behind one load balancer), `true`/`false`, or a list        |
| `CORS_ORIGINS`             | any in development, none elsewhere | Browser origins allowed to call the API (the admin dashboards), comma separated, or `*`. The mobile app doesn't need CORS |

Logs are JSON (readable in development) and never include passwords, tokens,
API keys or the `Authorization` header.

## Project structure

The code is organised by feature: each module holds its routes, schemas,
service and repository.

```
src/
  server.ts               Entry point: settings, database, migrations, listen, graceful shutdown
  app.ts                  The Express app: security, CORS, JSON, request IDs, routes, errors
  container.ts            Composition root: builds every service once, from the infrastructure
  config/env.ts           Settings, checked with zod at start-up
  modules/                One folder per feature
    auth/                 Sign-in, refresh, sign-out, profile; sessions; the signed-in check
    verifications/        Verify by plate, QR, E-Tag or RFID; history; trip refresh,
                          destination check, Loaded/Empty; plate rules; views
    dashboard/            Today's figures (Lagos day) and recent verifications
    notifications/        The agent's inbox
    etags/                E-Tag receipts
    reference-data/       States, LGAs, vehicle types, enforcement points
    audit/                Account and security events
    health/               /health and /health/ready
  integrations/chl/       The CHL adapter: interface, types, errors, mock and HTTP versions
  database/               Connection pool and transactions, migrator, migrations/, CLI
  http/                   Shared HTTP plumbing: the /api/v1 router, error handler, validation
  shared/                 AppError, logger, tokens, paging, Lagos time
tests/
  unit/                   No database: settings, plates, CHL adapters, the app's HTTP behaviour
  integration/            The API against a real PostgreSQL test database
  support/                The test harness (app, database, clock)
docs/                     API, database, CHL adapter, deployment
deploy/                   Staging and production settings templates
```

**A module's files:**

| File                   | Holds                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `<name>.routes.ts`     | The Express routes: check the request (schemas), call the service, shape the answer. No business rules or SQL. |
| `<name>.schemas.ts`    | zod schemas for request bodies and queries.                                                                    |
| `<name>.service.ts`    | The business rules. It calls repositories and the CHL adapter, and knows nothing about HTTP requests.          |
| `<name>.repository.ts` | The SQL. Plain functions that take a `Queryable`, so they work inside a transaction too.                       |
| `<name>.view.ts`       | What the app is shown, built from records. Dates become ISO strings, and internal IDs are dropped.             |

## Architecture

```
request → app.ts (helmet, CORS, JSON, request ID, logging)
        → http/api-v1.router.ts → modules/<feature>/<feature>.routes.ts
        → <feature>.service.ts → <feature>.repository.ts (PostgreSQL)
                               → integrations/chl (the existing CHL backend)
errors  → http/middleware/error-handler.ts → { "error": { code, message, requestId } }
```

- **Dependencies point inwards.** Routes use services, and services use
  repositories and the CHL adapter, never the other way round. Modules
  don't import each other's routes.
- **One composition root.** `container.ts` builds the services; `app.ts`
  and the tests pass in the infrastructure (logger, database, CHL adapter,
  clock), so tests can swap any of it.
- **CHL only through `ChlAdapter`.** A CHL failure is thrown, never returned
  as a result.
- **Errors:** an expected failure is an `AppError` (status, stable code,
  message) or a `ChlError`. Anything else is a bug: it is logged and
  answered as 500 without details.

## Documentation

| Document                                   | What it covers                                        |
| ------------------------------------------ | ----------------------------------------------------- |
| [docs/api.md](docs/api.md)                 | Every `/api/v1` endpoint, sessions, verifying, errors |
| [docs/database.md](docs/database.md)       | Tables and migrations                                 |
| [docs/chl-adapter.md](docs/chl-adapter.md) | The CHL adapter, error mapping, sample data           |
| [docs/deployment.md](docs/deployment.md)   | Dev, staging and production; the image; deploying     |

## Testing

`npm test` runs every test, and the tests never reach the real CHL:

- The CHL HTTP client runs against a real local HTTP server: timeouts, 5xx,
  404, 401, bad JSON, unreachable CHL.
- The mock adapter is tested for every sample scenario.
- The API is tested with supertest against a real PostgreSQL database, the
  one in `TEST_DATABASE_URL`. That database is wiped, so its name must end
  in `_test`; the tests refuse to run otherwise. Without `TEST_DATABASE_URL`
  the database tests are skipped.

```sh
createdb iteimedb_test   # once
```

## Conventions

- Code reads CHL only through `ChlAdapter`.
- A new feature is a new folder in `src/modules/`, with the files above.
  Register its routes in `http/api-v1.router.ts` and its service in
  `container.ts`.
- A schema change is a new file in `src/database/migrations/`, added to the
  list in its `index.ts`. Never edit a migration that has been applied.
- Commit and push to `main` after each change; update this README (or the
  doc concerned) and its change log in the same commit.
- Run `npm run check` before committing.
- Never commit `.env` or any credential.

## Roadmap

1. ✅ Foundation and the CHL adapter (mock + HTTP skeleton).
2. ✅ Database: sessions, verification records (audit trail with GPS),
   destination checks, Loaded/Empty, notifications, audit events; migrations.
3. ✅ Mobile API v1.
4. ✅ Connect the mobile app to the mobile API.
5. Fill in `HttpChlAdapter` from the CHL API documentation.
6. Choose the hosting and create the staging and production deployments.
7. Push notifications, and violations with the enforcement module.

## Change log

Newest first. Add a line for every change.

- Restructured by feature. No behaviour changed; all 90 tests pass.
  - `src/modules/<feature>/` each hold routes, schemas, service and
    repository.
  - `container.ts` is the composition root.
  - The CHL adapter moved to `integrations/chl/`, and the database code to
    `database/`, with one file per migration.
  - Errors, logger, tokens, paging and Lagos time are in `shared/`.
  - The dashboard, notifications and E-Tag receipts each have their own
    service.
  - Tests are split into `unit/` and `integration/`, with
    `npm run test:unit`, `npm run test:integration` and `npm run check`.
  - The reference sections moved to `docs/`; `.nvmrc` and `.editorconfig`
    were added, and Node 24 is required.

- Staging and production:
  - `APP_ENV` names the deployment, and is checked at start-up: production
    can't use the sample CHL data.
  - `TRUST_PROXY` for load balancers, and `CORS_ORIGINS` for the
    dashboards (none allowed outside development unless listed).
  - Health answers include `environment`.
  - Dockerfile, `compose.yaml`, settings templates in `deploy/`, and
    `npm run migrate:prod`.

- Connected to the mobile app.
  - Each verification answer now includes `plate`, also when CHL was
    unavailable.
  - Known failures such as CHL being unavailable are logged as warnings;
    unexpected errors are still logged as errors with their stack trace.

- Database and the mobile API v1:
  - PostgreSQL schema and migrations (run at start-up or with
    `npm run migrate`): sessions, verifications, destination checks,
    notifications, audit events.
  - Sign-in through CHL for enforcement agents only, with rotating tokens
    stored as hashes, 24-hour sessions, a deactivated-account check and
    sign-in rate limiting.
  - Verification by plate, QR, E-Tag or RFID. Every attempt is recorded with
    GPS, and "CHL unavailable" is never shown as a result. Safe retries,
    offline sync, trip refresh, destination check, Loaded/Empty, several
    tags at once, E-Tag receipt, reference data, dashboard, history and
    notifications.
  - `DATABASE_URL` is now required. 83 tests.

- Foundation: Express 5 + TypeScript project, settings, logging, JSON errors,
  request IDs, security headers, `/health` and `/health/ready`, PostgreSQL
  connection. The CHL adapter: `ChlAdapter` interface, `MockChlAdapter` with
  sample data for every verification result, and `HttpChlAdapter` with a
  working HTTP client (timeouts and error mapping) waiting for CHL's API
  documentation. 47 tests.
