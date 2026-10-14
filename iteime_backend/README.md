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

**Stack:** Node.js 20+, Express 5, TypeScript, PostgreSQL, Vitest.

## Contents

1. [Getting started](#getting-started)
2. [Configuration](#configuration)
3. [Project structure](#project-structure)
4. [The CHL adapter](#the-chl-adapter)
5. [API](#api)
6. [Testing](#testing)
7. [Conventions](#conventions)
8. [Roadmap](#roadmap)
9. [Change log](#change-log)

## Getting started

```sh
cd iteime_backend
npm install
cp .env.example .env    # defaults use the mock CHL; no database needed yet
npm run dev             # http://localhost:4000/health
```

| Script                            | What it does                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                     | Runs `src/server.ts` and restarts on changes                |
| `npm run build`                   | Compiles to `dist/`                                         |
| `npm start`                       | Runs the compiled server                                    |
| `npm test`                        | Runs the tests once (`npm run test:watch` to keep watching) |
| `npm run typecheck`               | Type-checks everything, tests included                      |
| `npm run lint` / `npm run format` | ESLint / Prettier                                           |

## Configuration

Settings come from environment variables (a `.env` file in development; see
[`.env.example`](.env.example)). They are checked at start-up
(`src/config/env.ts`); a wrong value stops the server with a readable message.

| Variable            | Default       | Meaning                                                        |
| ------------------- | ------------- | -------------------------------------------------------------- |
| `NODE_ENV`          | `development` | `development`, `test` or `production`                          |
| `PORT`              | `4000`        | HTTP port                                                      |
| `LOG_LEVEL`         | `info`        | Pino level (`silent` to turn logs off)                         |
| `DATABASE_URL`      | —             | PostgreSQL connection string; optional until the database step |
| `CHL_ADAPTER`       | `mock`        | `mock` (sample CHL data) or `http` (the real CHL backend)      |
| `CHL_BASE_URL`      | —             | The CHL API address; required when `CHL_ADAPTER=http`          |
| `CHL_API_KEY`       | —             | Server-to-server credential issued by the CHL team             |
| `CHL_TIMEOUT_MS`    | `10000`       | How long to wait for CHL before calling it unavailable         |
| `CHL_MOCK_DELAY_MS` | `0`           | Mock only: delay per call, to imitate a network                |

Logs are JSON (readable in development) and never include passwords, tokens,
API keys or the `Authorization` header.

## Project structure

```
src/
  server.ts            Starts the HTTP server; graceful shutdown
  app.ts               The Express app (dependencies passed in, so tests swap them)
  config/env.ts        Settings, checked with zod
  chl/                 The CHL adapter (see below)
    adapter.ts         The ChlAdapter interface: everything we ask CHL
    types.ts           CHL data in our own terms
    errors.ts          CHL failures (unavailable, invalid credentials, …)
    index.ts           createChlAdapter(): mock or http, from the settings
    mock/              MockChlAdapter and its sample data
    http/              HttpChlAdapter (real CHL) and its HTTP client
  domain/plate.ts      Plate normalisation (SRD §11)
  db/pool.ts           PostgreSQL connection
  http/                Health routes and the JSON error handler
  lib/                 Logger and AppError
tests/                 Vitest tests, mirroring src/
```

## The CHL adapter

`ChlAdapter` (`src/chl/adapter.ts`) is the only way the backend reaches the
existing CHL backend. Its calls follow the request sent to the CHL team,
_CHL Backend API Requirements - ITEIME Backend and Mobile MVP_ (section numbers
in brackets):

| Call                                                                                          | Purpose                                               |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `signIn`, `refreshSession`, `signOut`, `requestPasswordReset`, `getAgent`, `getAccountStatus` | Agent sign-in and session (3.1)                       |
| `verifyVehicle`                                                                               | Verify by plate, QR reference or RFID tag (3.2)       |
| `resolveTags`                                                                                 | Several RFID tags read together (3.2, SRD §9.6)       |
| `refreshTrip`                                                                                 | The vehicle's trip now (3.3)                          |
| `recordDestinationLocation`                                                                   | The agent's GPS for the destination check (3.4)       |
| `recordLoadStatus`                                                                            | Loaded / Empty confirmation (3.5)                     |
| `getETagReceipt`                                                                              | E-Tag receipt (3.6)                                   |
| `getReferenceData`                                                                            | States, LGAs, vehicle types, enforcement points (3.7) |
| `healthCheck`                                                                                 | Whether CHL answers                                   |

**Results versus failures.** `verifyVehicle` returns `found` (vehicle, E-Tag
status, trip status), `vehicleNotFound` or `unknownTag`. A CHL failure
(timeout, network error, 5xx) is **thrown** as `ChlUnavailableError` and never
returned as a result, so it can't be shown as "No Active Trip" (SRD §15, §26.2).
The error handler answers each CHL error with one clear code:

| CHL error                    | HTTP | Code                  |
| ---------------------------- | ---- | --------------------- |
| `ChlUnavailableError`        | 503  | `CHL_UNAVAILABLE`     |
| `ChlInvalidCredentialsError` | 401  | `INVALID_CREDENTIALS` |
| `ChlAccountDeactivatedError` | 403  | `ACCOUNT_DEACTIVATED` |
| `ChlSessionExpiredError`     | 401  | `SESSION_EXPIRED`     |
| `ChlNotFoundError`           | 404  | `NOT_FOUND`           |
| `ChlBadResponseError`        | 502  | `CHL_BAD_RESPONSE`    |
| `ChlNotImplementedError`     | 501  | `CHL_NOT_CONNECTED`   |

**`MockChlAdapter`** (`CHL_ADAPTER=mock`, the default) answers from
`src/chl/mock/mock-data.ts`, so the backend and the mobile app can be built and
tested without CHL. It keeps sessions and recorded actions in memory.

Sample accounts (password `Demo@2026`):

| Email                 | Result                                              |
| --------------------- | --------------------------------------------------- |
| `officer@jbr.com`     | Active enforcement agent (JRB-AG-0142)              |
| `deactivated@jbr.com` | Deactivated account                                 |
| `clerk@jbr.com`       | Active, but role `CLERK` (not an enforcement agent) |

Sample vehicles (plates normalised):

| Plate      | RFID tag                                     | QR reference  | Result                                                     |
| ---------- | -------------------------------------------- | ------------- | ---------------------------------------------------------- |
| `ABC123AA` | `E2000017221101441890ABC1`                   | `JRB-QR-0001` | Active trip (Ogun → Lagos), valid E-Tag, destination check |
| `LND482XK` | `E2000017221101441890D482`                   | `JRB-QR-0002` | No active trip, completed last trip, invalid E-Tag         |
| `AAA001AA` | `E2000017221101441890A001`                   | `JRB-QR-0003` | No trip history                                            |
| `EXP900AA` | `E2000017221101441890E900`                   | `JRB-QR-0004` | Expired trip                                               |
| `KTG100AA` | —                                            | —             | No E-Tag on the vehicle                                    |
| `KJA555MM` | —                                            | —             | Carrying LND 482 XK's tag (mismatch)                       |
| `AAA000AA` | —                                            | `JRB-QR-0404` | Vehicle not found                                          |
| `AAA503AA` | `E20000172211014418900503`                   | `JRB-QR-0503` | CHL unavailable                                            |
| —          | `3034257BF7194E4000000001` (any unknown tag) | —             | Not part of the JRB CHL architecture                       |

**`HttpChlAdapter`** (`CHL_ADAPTER=http`) is the real CHL backend. Its HTTP
client (`chl-http-client.ts`) already handles the address, API key, agent
token, timeouts and error mapping. Each call throws `ChlNotImplementedError`
until it is filled in from CHL's API documentation (`TODO(chl)`); switching to
the real CHL then changes nothing outside `src/chl/http/`.

## API

| Method | Path            | Answer                                                                                                       |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/health`       | `200 {"status":"ok"}` while the process runs                                                                 |
| GET    | `/health/ready` | `200` when CHL answers and the database (if configured) answers, else `503`; each check's status in `checks` |

Every response carries an `X-Request-Id` header (the caller's, if sent).
Errors use one JSON shape:

```json
{
  "error": { "code": "ROUTE_NOT_FOUND", "message": "This route does not exist.", "requestId": "…" }
}
```

The mobile API (`/api/v1`) comes next; see the roadmap.

## Testing

`npm test` runs every test. The CHL HTTP client is tested against a real
local HTTP server (timeouts, 5xx, 404, 401, bad JSON, unreachable CHL); the
mock adapter is tested for every sample scenario; the app is tested with
supertest. Tests never reach the real CHL.

## Conventions

- Code reads CHL only through `ChlAdapter`.
- Commit and push to `main` after each change; update this README and its
  change log in the same commit.
- Run `npm run lint`, `npm run typecheck` and `npm test` before committing.
- Never commit `.env` or any credential.

## Roadmap

1. ✅ Foundation and the CHL adapter (mock + HTTP skeleton).
2. Database: verification records (audit trail with GPS), sessions, haulage
   checks, notifications; migrations.
3. Mobile API v1: auth, verifications (all methods, multiple tags), trip
   refresh, destination location, load status, dashboard, history,
   notifications.
4. Connect the mobile app to the mobile API.
5. Fill in `HttpChlAdapter` from the CHL API documentation.

## Change log

Newest first. Add a line for every change.

- Foundation: Express 5 + TypeScript project, settings, logging, JSON errors,
  request IDs, security headers, `/health` and `/health/ready`, PostgreSQL
  connection. The CHL adapter: `ChlAdapter` interface, `MockChlAdapter` with
  sample data for every verification result, and `HttpChlAdapter` with a
  working HTTP client (timeouts and error mapping) waiting for CHL's API
  documentation. 47 tests.
