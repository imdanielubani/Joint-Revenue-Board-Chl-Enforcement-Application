# ITEIME backend

The backend of the **ITEIME Enforcement Engine**, the JRB system for enforcement
case management. It will serve the ITEIME Admin Dashboard and, once confirmed,
the JRB CHL Enforcement mobile app and the Monitoring Dashboard. It reaches the
existing JRB CHL platform only through a CHL adapter.

**Status: Phase 2 (architecture and data model) done; awaiting review.** The
app runs, with health endpoints, middleware, configuration, a Prisma setup
without models, tests, and the architecture and data-model proposals.
**No business features are implemented yet.**

> The earlier backend, `iteime_backend/`, was removed from the repository
> (commit `d3f5652`). The mobile app's `/api/v1` contract that it served is
> not implemented here yet. See
> [ADR-0004](docs/decisions/0004-single-backend.md) and
> [ADR-0009](docs/decisions/0009-api-conventions-and-mobile-contract.md).

**Stack:** Node.js ≥ 22.18, Express 5, TypeScript (strict), PostgreSQL,
Prisma 7, zod, pino, Vitest, ESLint, Prettier.

## Contents

1. [Getting started](#getting-started)
2. [Commands](#commands)
3. [Configuration](#configuration)
4. [Database and migrations](#database-and-migrations)
5. [Project structure](#project-structure)
6. [API](#api)
7. [Testing](#testing)
8. [Documentation](#documentation)
9. [Current limitations](#current-limitations)
10. [Change log](#change-log)

## Getting started

```sh
cd backend
npm install                 # also runs `prisma generate`
cp .env.example .env        # set DATABASE_URL to a local PostgreSQL database
npm run dev                 # http://localhost:4000/health/live
```

Without `DATABASE_URL`, the server still starts in development. `/health/ready`
then answers 503 with `"database": "not_configured"`.

## Commands

| Command                           | What it does                                                          |
| --------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                     | Runs `src/server.ts` with reload on change                            |
| `npm run build`                   | Compiles to `dist/`                                                   |
| `npm start`                       | Runs the compiled server (`dist/server.js`)                           |
| `npm run typecheck`               | Type-checks source and tests                                          |
| `npm run lint`                    | ESLint                                                                |
| `npm run format` / `format:check` | Prettier write / check                                                |
| `npm test` / `test:watch`         | Vitest, once / watching                                               |
| `npm run check`                   | typecheck + lint + format check + tests (run before every commit)     |
| `npm run prisma:generate`         | Regenerates the Prisma client into `src/generated/prisma`             |
| `npm run prisma:validate`         | Validates `prisma/schema.prisma`                                      |
| `npm run db:migrate:dev`          | Creates and applies a migration in development (`prisma migrate dev`) |
| `npm run db:migrate:deploy`       | Applies committed migrations (staging/production)                     |
| `npm run db:migrate:status`       | Shows migration status                                                |

## Configuration

Environment variables are validated at start-up (`src/config/env.ts`). In
development, a `.env` file is read if present. An invalid value stops the
server with a message naming the variable, never its value.

| Variable                | Default       | Meaning                                                                      |
| ----------------------- | ------------- | ---------------------------------------------------------------------------- |
| `NODE_ENV`              | `development` | `development`, `test` or `production`                                        |
| `PORT`                  | `4000`        | HTTP port                                                                    |
| `LOG_LEVEL`             | `info`        | pino level, or `silent`                                                      |
| `DATABASE_URL`          | —             | PostgreSQL URL. Required in production; optional elsewhere                   |
| `CORS_ORIGINS`          | (none)        | Comma-separated browser origins allowed (the dashboards). `*` is refused     |
| `TRUST_PROXY`           | `false`       | `true`, `false`, or a hop count behind load balancers                        |
| `RATE_LIMIT_PER_MINUTE` | `300`         | Per-IP API requests per minute (health is exempt)                            |
| `CHL_BASE_URL`          | —             | CHL API address, once its contract is confirmed. Must be https in production |
| `CHL_TIMEOUT_MS`        | `10000`       | Timeout for CHL calls                                                        |
| `TEST_DATABASE_URL`     | —             | Tests only: enables the real-database readiness test (runs `SELECT 1` only)  |

Logs are JSON lines. Request bodies, query strings, cookies and
`Authorization` headers are never logged.

## Database and migrations

- The schema is `prisma/schema.prisma`, and the connection is set in
  `prisma.config.ts`. **There are no models yet**: entities are proposed in
  Phase 2, once [data ownership](docs/architecture/data-ownership.md) is
  agreed. CHL-owned data is never copied here without a documented decision.
- To create a migration: change the schema, run `npm run db:migrate:dev -- --name <change>`,
  review the generated SQL in `prisma/migrations/`, and commit it.
- Deployed environments run `npm run db:migrate:deploy` as a separate release
  step. The server never migrates at start-up.
- Never run destructive migrations (or `prisma migrate reset`) against a
  shared database without explicit approval.

See [ADR-0002](docs/decisions/0002-prisma-with-pg-adapter.md).

## Project structure

```
prisma/schema.prisma        Datasource and generator only (no models yet)
prisma.config.ts            Prisma 7 config (schema path, migrations, DB URL)
src/
  server.ts                 Loads config, connects, listens; graceful shutdown
  app.ts                    Builds the Express app from injected dependencies
  config/env.ts             Environment validation (zod)
  config/logger.ts          pino logger and redaction list
  database/prisma.ts        Prisma client (pg adapter) and the database readiness check
  modules/health/           GET /health/live, GET /health/ready
  routes/v1/                The /api/v1 router (no routes yet)
  integrations/chl/         CHL boundary: types, ChlError, ChlClient interface
  shared/errors/            AppError and the error body type
  shared/middleware/        Request ID, request logging, 404, error handler
  generated/prisma/         Generated Prisma client (git-ignored)
tests/
  unit/                     Config, readiness, error handler
  integration/              HTTP behaviour through supertest; optional real-DB test
  contract/                 docs/api/openapi.yaml against the implemented endpoints
docs/                       Architecture, API, requirements, decisions
```

Module layout and layering: [component-boundaries.md](docs/architecture/component-boundaries.md).

## API

| Method and path     | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `GET /health/live`  | Liveness: 200 `{"status":"ok"}`                     |
| `GET /health/ready` | Readiness: 200 or 503 with each dependency's status |

`/api/v1` exists, but it has no routes yet. Specification: [docs/api/openapi.yaml](docs/api/openapi.yaml).
Conventions (errors, request IDs, limits, idempotency): [docs/api/api-conventions.md](docs/api/api-conventions.md).

## Testing

`npm test` runs every test without a database. Tests build the app with
injected dependencies, so they never touch real services.

To also check readiness against a real PostgreSQL server, set
`TEST_DATABASE_URL`. That test only runs `SELECT 1`.

## Documentation

| Document                                                                                         | What it covers                         |
| ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| [docs/architecture/system-context.md](docs/architecture/system-context.md)                       | Systems, actors, flows; label legend   |
| [docs/architecture/component-boundaries.md](docs/architecture/component-boundaries.md)           | Domains, maturity, module dependencies |
| [docs/architecture/data-ownership.md](docs/architecture/data-ownership.md)                       | Who owns which data; how it is stored  |
| [docs/architecture/api-boundaries.md](docs/architecture/api-boundaries.md)                       | Per-client API boundaries; routing     |
| [docs/architecture/data-model-proposal.md](docs/architecture/data-model-proposal.md)             | Proposed entities, ER and state models |
| [docs/api/api-conventions.md](docs/api/api-conventions.md)                                       | Implemented and proposed API rules     |
| [docs/requirements/requirements-traceability.md](docs/requirements/requirements-traceability.md) | Requirements → owner → module → status |
| [docs/requirements/open-questions.md](docs/requirements/open-questions.md)                       | Everything unresolved, with its source |
| [docs/decisions/](docs/decisions/README.md)                                                      | Architecture decision records          |
| [src/integrations/chl/README.md](src/integrations/chl/README.md)                                 | Rules for the CHL boundary             |

## Current limitations

- No authentication, authorization, audit log or business endpoints yet (Phases 3–4).
- The CHL client has no operations: the CHL API contract is not available (Q-CHL-1).
- Readiness checks the database only; CHL has no known health endpoint (Q-CHL-8).
- No Prisma models or migrations yet. The data model is a proposal awaiting
  review ([data-model-proposal.md](docs/architecture/data-model-proposal.md)).
- No Dockerfile or Compose file yet: Docker wasn't available to verify one in
  this environment. The removed `iteime_backend` had one (git history,
  `d654c84`) that can serve as a reference.
- Graceful shutdown on SIGTERM/SIGINT is implemented but not covered by an
  automated test.
- `npm audit` reports 4 high-severity advisories, all through the `prisma` 7.10
  CLI (`@prisma/config` → `deepmerge-ts`, and `mysql2`). The only automatic fix
  is a downgrade to Prisma 6, so none was applied. `npm ls` shows both
  packages only under the `prisma` CLI, a dev dependency, not under
  `@prisma/client` or `@prisma/adapter-pg`.
  Re-check when Prisma releases an update.

## Change log

Newest first.

- **Phase 2 architecture and data model (documentation only).**
  - New documents: API boundaries for each client, a data-model proposal (ER
    and state diagrams), and ADRs 0004–0009 (all proposed).
  - Rewritten: system context, component boundaries (25 domains with
    maturity grades), data ownership (strategies REF, SNAPSHOT, CACHE, OWN,
    DERIVED) and the traceability matrix (T1–T18 against the SRD and MON).
  - API conventions now mark each rule as implemented or proposed. The open
    questions are restructured, with the recorded contradictions X1–X10 and
    the decisions needed before Phase 3.
  - No code or schema changes.

- **Phase 1 foundation.** TypeScript/Express app with configuration
  validation, structured logging with redaction, request IDs, security headers,
  CORS allow-list, rate and body limits, central 404 and error handling;
  `/health/live` and `/health/ready` (database check); Prisma 7 setup without
  models; CHL boundary types; OpenAPI for the implemented endpoints; unit,
  integration and contract tests; architecture, data-ownership, traceability,
  open-questions and ADR documents.
