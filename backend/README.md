# ITEIME backend

The backend of the **ITEIME Enforcement Engine**, the JRB system for enforcement
case management. It is the only backend of this project (ADR-0004). It serves
the JRB CHL Enforcement mobile app, the Monitoring Dashboard and, later, the
ITEIME Admin Dashboard. It reaches the existing JRB CHL platform only through
its CHL adapter.

**Status: Phase 3 (core platform services) done; awaiting review before
Phase 4.** Implemented and tested:

- sign-in, refresh, sign-out and forgot password;
- server-side authorization;
- the append-only audit trail;
- the CHL boundary;
- standard errors and request validation.

**No enforcement workflow is implemented yet.**

> **CHL is simulated.** CHL's API contract is not available, so sign-in uses
> either no provider (503 `CHL_NOT_CONFIGURED`) or the labelled **FAKE** CHL
> identity provider (synthetic accounts, development and tests only, refused
> in production). Nothing here has been tested against the real CHL. See
> [ADR-0010](docs/decisions/0010-iteime-sessions-and-chl-identity-provider.md).

**Stack:** Node.js ≥ 22.18, Express 5, TypeScript (strict), PostgreSQL,
Prisma 7, zod, pino, Vitest, ESLint, Prettier.

## Contents

1. [Getting started](#getting-started)
2. [Commands](#commands)
3. [Configuration](#configuration)
4. [Database and migrations](#database-and-migrations)
5. [Project structure](#project-structure)
6. [API](#api)
7. [Security](#security)
8. [Testing](#testing)
9. [Documentation](#documentation)
10. [Current limitations](#current-limitations)
11. [Change log](#change-log)

## Getting started

```sh
cd backend
npm install                 # also runs `prisma generate`
cp .env.example .env        # set DATABASE_URL (and TEST_DATABASE_URL) for local PostgreSQL
npm run db:migrate:deploy   # create the tables
npm run dev                 # http://localhost:4000/health/ready
```

To sign in locally, set `CHL_IDENTITY_PROVIDER=fake` in `.env` and use a fake
account, for example `agent.one@example.test` with password
`fake-chl-password` (all accounts are listed in
[src/integrations/chl/README.md](src/integrations/chl/README.md)):

```sh
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent.one@example.test","password":"fake-chl-password"}'
```

## Commands

| Command                           | What it does                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                     | Runs `src/server.ts` with reload on change                                      |
| `npm run build`                   | Compiles to `dist/`                                                             |
| `npm start`                       | Runs the compiled server (`dist/server.js`)                                     |
| `npm run typecheck`               | Type-checks source, tests and scripts                                           |
| `npm run lint`                    | ESLint                                                                          |
| `npm run format` / `format:check` | Prettier write / check                                                          |
| `npm test` / `test:watch`         | Vitest, once / watching                                                         |
| `npm run check`                   | typecheck + lint + format check + tests (run before every commit)               |
| `npm run prisma:generate`         | Regenerates the Prisma client into `src/generated/prisma`                       |
| `npm run prisma:validate`         | Validates `prisma/schema.prisma`                                                |
| `npm run db:migrate:dev`          | Creates and applies a migration in development (`prisma migrate dev`)           |
| `npm run db:migrate:deploy`       | Applies committed migrations                                                    |
| `npm run db:migrate:status`       | Shows migration status                                                          |
| `npm run db:reset`                | **Local only**: drops the local database's schema and re-applies all migrations |

## Configuration

Environment variables are validated at start-up (`src/config/env.ts`). In
development, a `.env` file is read if present. An invalid value stops the
server with a message naming the variable, never its value.

| Variable                   | Default       | Meaning                                                                              |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `NODE_ENV`                 | `development` | `development`, `test` or `production`                                                |
| `PORT`                     | `4000`        | HTTP port                                                                            |
| `LOG_LEVEL`                | `info`        | pino level, or `silent`                                                              |
| `DATABASE_URL`             | —             | PostgreSQL URL. Required in production; without it (development) sign-in answers 503 |
| `CORS_ORIGINS`             | (none)        | Comma-separated browser origins allowed (the dashboards). `*` is refused             |
| `TRUST_PROXY`              | `false`       | `true`, `false`, or a hop count behind load balancers                                |
| `RATE_LIMIT_PER_MINUTE`    | `300`         | Per-IP API requests per minute (health is exempt)                                    |
| `CHL_BASE_URL`             | —             | CHL API address, once its contract is confirmed. Must be https in production         |
| `CHL_TIMEOUT_MS`           | `10000`       | Timeout for every CHL call                                                           |
| `CHL_IDENTITY_PROVIDER`    | `none`        | `none` (sign-in answers 503) or `fake` (synthetic accounts; refused in production)   |
| `ACCESS_TOKEN_TTL_MINUTES` | `30`          | Access-token lifetime, 5–120 (an assumption to confirm, Q-OPS-6)                     |
| `SESSION_TTL_HOURS`        | `24`          | Absolute length of a sign-in, 1–24 (SRD §5.3)                                        |
| `TEST_DATABASE_URL`        | —             | Tests only: a separate local database ending in `_test`; its tables are emptied      |

Logs are JSON lines. Request bodies, query strings, cookies and
`Authorization` headers are never logged.

## Database and migrations

- The schema is `prisma/schema.prisma`, and the connection is set in
  `prisma.config.ts`. It contains only the two **platform** tables approved
  for Phase 3:
  - `sessions`: ITEIME-issued sessions; token hashes only.
  - `audit_events`: the audit trail. It is append-only: a trigger refuses
    UPDATE and DELETE.

  Business tables arrive module by module, from the reviewed
  [data-model proposal](docs/architecture/data-model-proposal.md). CHL-owned
  data is never copied here without a documented decision (ADR-0007).

- Migration `20261014120000_platform_sessions_audit` is generated SQL plus a
  reviewed hand-written part (CHECK constraints and the append-only trigger).
- **To create a migration:** change the schema, run
  `npm run db:migrate:dev -- --name <change>`, review the generated SQL in
  `prisma/migrations/`, and commit it.
- **Deployed environments** run `npm run db:migrate:deploy` as a separate
  release step. The server never migrates at start-up.
- **Local reset:** `npm run db:reset` refuses unless `DATABASE_URL` is on this
  machine and `NODE_ENV` isn't `production`. There is no seed data: the only
  synthetic identities are the fake CHL provider's accounts. Never run
  destructive commands against a shared database.
- **Prisma 7 needs a datasource URL even for offline commands** such as
  `migrate diff`, and fails silently without one. Set `DATABASE_URL`,
  or a placeholder URL for diffs that don't connect.

See [ADR-0002](docs/decisions/0002-prisma-with-pg-adapter.md).

## Project structure

```
prisma/
  schema.prisma             Session and AuditEvent models
  migrations/               Reviewed SQL migrations
prisma.config.ts            Prisma 7 config (schema path, migrations, DB URL)
scripts/db-reset.ts         Local-only database reset
src/
  server.ts                 Loads config, wires services, listens; graceful shutdown
  app.ts                    Builds the Express app from injected dependencies
  config/                   Environment validation (zod); pino logger and redaction
  database/                 Prisma client, readiness check, Persistence (repositories + transactions)
  routes/v1/                The /api/v1 router: shared and monitoring surfaces
  modules/
    health/                 GET /health/live, GET /health/ready
    auth/                   Sessions, sign-in/refresh/logout/forgot password, authenticate middleware
    access-control/         Roles, clients, permissions, scope; requireClient/requirePermission/readOnly
    audit/                  Append-only audit trail, redaction, GET monitoring/audit-events
  integrations/chl/         CHL boundary: guard, identity interface, unconfigured client, FAKE provider
  shared/errors/            AppError and the error-code registry
  shared/middleware/        Request ID, request logging, validation, 404, error handler
  generated/prisma/         Generated Prisma client (git-ignored)
tests/
  unit/                     Config, policy, audit, CHL boundary, error handler, readiness
  integration/              HTTP behaviour (auth, monitoring, app); PostgreSQL tests
  contract/                 openapi.yaml against real responses and the error-code registry
  support/                  Test harness, in-memory persistence, database global setup
docs/                       Architecture, API, requirements, decisions
```

Module layout and layering: [component-boundaries.md](docs/architecture/component-boundaries.md).

## API

| Method and path                       | Purpose                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /health/live`                    | Liveness: 200 `{"status":"ok"}`                                                 |
| `GET /health/ready`                   | Readiness: 200 or 503 with each dependency's status                             |
| `POST /api/v1/auth/login`             | Sign in (`client`: `mobile` by default, agents only; or `monitoring`)           |
| `POST /api/v1/auth/refresh`           | New tokens; re-checks the account with CHL                                      |
| `POST /api/v1/auth/logout`            | End the session                                                                 |
| `POST /api/v1/auth/forgot-password`   | Start CHL password recovery                                                     |
| `GET /api/v1/me`                      | The signed-in user                                                              |
| `GET /api/v1/monitoring/audit-events` | Complete audit trail, for System Administrators (monitoring sessions; GET only) |

- Specification: [docs/api/openapi.yaml](docs/api/openapi.yaml).
- Conventions (errors, validation, request IDs, pagination, audit, CHL
  failures): [docs/api/api-conventions.md](docs/api/api-conventions.md).
- Error codes are UPPER_SNAKE_CASE and match the mobile app (ADR-0009).

## Security

Controls in place, each covered by tests:

- **Tokens:** opaque, random, stored only as SHA-256 hashes. A sign-in ends
  after 24 hours however often it is refreshed. Refresh tokens are
  single-use.
- **Account checks:** every refresh re-checks the account with CHL. A
  deactivated or missing account ends all of its sessions. If CHL is down, the
  refresh is refused and the session kept.
- **Identity:** the caller's identity comes only from the server-side session.
- **Separate surfaces:** mobile and monitoring sessions each work only on
  their own routes.
- **Default deny:** each permission is granted only with a cited source.
  Denials are audited.
- **Monitoring is read-only:** every non-GET request gets 405.
- **Sign-in protection:** 10 attempts per IP per 15 minutes on login and
  forgot-password. Forgot-password doesn't reveal whether an account exists.
- **CHL outages** are reported as 503, never as wrong credentials or another
  negative answer.
- **Audit trail:**
  - append-only in code and in the database;
  - redacted (no passwords, tokens or RFID values; emails masked);
  - written in the same transaction as the change it records.

This is not a claim of production readiness. See the limitations below.

## Testing

`npm test` runs every test. Tests build the app with injected test doubles
(the fake CHL provider and in-memory persistence), so they never touch CHL.

With `TEST_DATABASE_URL` set (in `.env` or the environment), the tests also:

- apply the migrations to that database;
- run the PostgreSQL tests: repositories, constraints, the append-only
  trigger, transaction rollback, and the full sign-in flow.

The database must be local, and its name must end in `_test`; the tests
refuse anything else, because they empty its tables. Without
`TEST_DATABASE_URL`, those tests are skipped.

## Documentation

| Document                                                                                         | What it covers                         |
| ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| [docs/architecture/system-context.md](docs/architecture/system-context.md)                       | Systems, actors, flows; label legend   |
| [docs/architecture/component-boundaries.md](docs/architecture/component-boundaries.md)           | Domains, maturity, module dependencies |
| [docs/architecture/data-ownership.md](docs/architecture/data-ownership.md)                       | Who owns which data; how it is stored  |
| [docs/architecture/api-boundaries.md](docs/architecture/api-boundaries.md)                       | Per-client API boundaries; routing     |
| [docs/architecture/data-model-proposal.md](docs/architecture/data-model-proposal.md)             | Entities (two implemented), ER, states |
| [docs/api/api-conventions.md](docs/api/api-conventions.md)                                       | Implemented and proposed API rules     |
| [docs/requirements/requirements-traceability.md](docs/requirements/requirements-traceability.md) | Requirements → module → tests → status |
| [docs/requirements/open-questions.md](docs/requirements/open-questions.md)                       | Everything unresolved, with its source |
| [docs/decisions/](docs/decisions/README.md)                                                      | Architecture decision records          |
| [src/integrations/chl/README.md](src/integrations/chl/README.md)                                 | CHL boundary rules; fake accounts      |

## Current limitations

- **No real CHL integration.** Only the labelled fake, until the CHL contract
  arrives (Q-CHL-1, Q-CHL-2).
- **Deactivation isn't immediate.** It takes effect at the next refresh
  (within 30 minutes), not at once as SRD §5.3 requires; that needs a CHL
  event (Q-CHL-3).
- **Partial permission matrix.** Only the confirmed grants exist (the complete
  audit trail for the System Administrator) (Q-ROL-1). The scope check denies
  across levels until CHL defines the hierarchy (Q-CHL-10).
- **No enforcement workflows yet:** no mobile business endpoints, no
  idempotency (Q-SYN-2), no Admin Dashboard surface (Q-ROL-1).
- **Readiness checks the database only;** CHL has no known health endpoint
  (Q-CHL-8).
- **The audit trail is append-only but not tamper-proof** (Q-OPS-2), and its
  retention is undefined (Q-OPS-1).
- **No Dockerfile or Compose file yet.** Docker wasn't available to verify
  one.
- **Graceful shutdown** on SIGTERM/SIGINT is implemented but not covered by an
  automated test.
- **`npm audit` reports 4 high-severity advisories**, all through the
  `prisma` 7.10 CLI (`@prisma/config` → `deepmerge-ts`, and `mysql2`). The
  only automatic fix is a downgrade to Prisma 6, so none was applied. `npm ls`
  shows both packages only under the `prisma` CLI, a dev dependency, not under
  `@prisma/client` or `@prisma/adapter-pg`. Re-check when Prisma releases an
  update.

## Change log

Newest first.

- **Phase 3: core platform services.**
  - **Authentication:** ITEIME-issued sessions (opaque hashed tokens, 24-hour
    limit, single-use refresh with CHL re-check), logout and forgot password,
    with a CHL identity provider interface (none / labelled FAKE).
  - **Authorization:** client surfaces, confirmed permissions only, a
    fail-closed scope check, and a read-only monitoring surface.
  - **Audit:** an append-only, redacted trail written atomically with each
    change, and a read route for System Administrators.
  - **Errors and conventions:** UPPER_SNAKE error codes (ADR-0009), a request
    validation middleware, and an OpenAPI file covering every route and error
    code.
  - **Database:** migration for `sessions` and `audit_events`, a local
    `db:reset`, and PostgreSQL integration tests.
  - **Decisions:** ADRs 0005–0009 accepted; ADR-0010 added.
- **ADR-0004 accepted.** The project owner confirmed that `backend/` is the
  only backend and the main backend (Q-REP-1 answered).
- **Phase 2 architecture and data model (documentation only).**
  - New documents: API boundaries for each client, a data-model proposal (ER
    and state diagrams), and ADRs 0004–0009.
  - Rewritten: system context, component boundaries (25 domains with maturity
    grades), data ownership (strategies REF, SNAPSHOT, CACHE, OWN, DERIVED)
    and the traceability matrix (T1–T18 against the SRD and MON).
  - Open questions restructured, with the recorded contradictions X1–X10.
- **Phase 1 foundation.**
  - TypeScript/Express app with configuration validation, structured logging
    with redaction, request IDs, security headers, a CORS allow-list, rate
    and body limits, and central 404 and error handling.
  - `/health/live` and `/health/ready`, with a database check.
  - Prisma 7 setup; CHL boundary types; OpenAPI; tests; architecture and
    requirements documents.
