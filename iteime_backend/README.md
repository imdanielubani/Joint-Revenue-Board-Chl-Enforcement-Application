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
5. [Database](#database)
6. [Mobile API v1](#mobile-api-v1)
7. [Environments and deployment](#environments-and-deployment)
8. [Testing](#testing)
9. [Conventions](#conventions)
10. [Roadmap](#roadmap)
11. [Change log](#change-log)

## Getting started

```sh
cd iteime_backend
npm install
cp .env.example .env    # set DATABASE_URL to your PostgreSQL database
npm run dev             # migrates the database, then http://localhost:4000/health/ready
```

| Script                            | What it does                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`                     | Runs `src/server.ts` and restarts on changes                                  |
| `npm run build`                   | Compiles to `dist/`                                                           |
| `npm start`                       | Runs the compiled server                                                      |
| `npm run migrate`                 | Brings the database schema up to date (the server also does this at start-up) |
| `npm test`                        | Runs the tests once (`npm run test:watch` to keep watching)                   |
| `npm run typecheck`               | Type-checks everything, tests included                                        |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                             |

## Configuration

Settings come from environment variables (a `.env` file in development; see
[`.env.example`](.env.example)). They are checked at start-up
(`src/config/env.ts`); a wrong value stops the server with a readable message.

| Variable                   | Default                            | Meaning                                                                                                                   |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `development`                      | `development`, `test` or `production`                                                                                     |
| `APP_ENV`                  | `development`                      | Which deployment: `development`, `staging` or `production` (see below)                                                    |
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
  domain/              Plate rules (SRD §11); what the app is shown of a CHL answer
  db/                  PostgreSQL pool, transactions, migrations and their runner
  repositories/        SQL: sessions, verifications, notifications, audit events
  services/            AuthService (sign-in, sessions) and VerificationService
  http/                /api/v1 routes, sign-in check, validation, health, errors
  lib/                 Logger, AppError, tokens
tests/                 Vitest tests; tests/api/ runs against TEST_DATABASE_URL
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

## Database

PostgreSQL holds what ITEIME itself owns; everything about vehicles, tags and
trips stays in CHL. The schema is in `src/db/migrations.ts` as numbered steps.
The server applies new steps at start-up, each step once, under a lock, so
several servers can start together. A step that has been applied is never
edited; changes go in a new step.

| Table                   | What it holds                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent_sessions`        | Signed-in sessions. Tokens are stored only as SHA-256 hashes.                                                                                                                                 |
| `verifications`         | Every verification attempt, whatever its outcome, with the agent, method, identifier processed, GPS, what the app was shown, sync status and Loaded/Empty. This is the audit trail (SRD §28). |
| `destination_locations` | Locations sent for a trip's destination check                                                                                                                                                 |
| `notifications`         | Each agent's notifications inbox                                                                                                                                                              |
| `audit_events`          | Sign-ins (successful or not), sign-outs, password-reset requests                                                                                                                              |

## Mobile API v1

All paths start with `/api/v1`. Everything except the first three needs
`Authorization: Bearer <accessToken>`. Bodies and answers are JSON, and dates
are ISO 8601.

| Method | Path                                                 | What it does                                                                                                                                                                       |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`                                        | `{email, password, device?}` → tokens and the agent's profile. Only enforcement agents get in (`AGENT_ACCESS_DENIED` otherwise). 10 attempts per 15 minutes per address and email. |
| POST   | `/auth/refresh`                                      | `{refreshToken}` → new tokens; the old refresh token stops working. Checks with CHL that the account is still active.                                                              |
| POST   | `/auth/forgot-password`                              | `{email}` → 202, the same answer whether or not the account exists                                                                                                                 |
| POST   | `/auth/logout`                                       | Ends the session (204)                                                                                                                                                             |
| GET    | `/me`                                                | The agent's profile, from CHL                                                                                                                                                      |
| GET    | `/dashboard`                                         | Today's totals (Lagos day), the 5 latest verifications, unread notifications                                                                                                       |
| POST   | `/verifications`                                     | Verify a vehicle (see below) → 201                                                                                                                                                 |
| GET    | `/verifications?period=30d\|all&limit=20&cursor=`    | The agent's history, newest first; `nextCursor` for the next page                                                                                                                  |
| GET    | `/verifications/:id`                                 | One verification, with the agent and destination-check locations                                                                                                                   |
| POST   | `/verifications/:id/trip/refresh`                    | The vehicle's trip now (Refresh Trip Status)                                                                                                                                       |
| POST   | `/verifications/:id/destination-location`            | `{location}` → sends the agent's GPS for the active trip's destination check                                                                                                       |
| POST   | `/verifications/:id/load-status`                     | `{status: "loaded"\|"empty", location}` for a vehicle without an active trip                                                                                                       |
| POST   | `/rfid/resolve-tags`                                 | `{tagReferences: [...]}` → each tag's plate, for several tags read together                                                                                                        |
| GET    | `/etags/:reference/receipt`                          | The E-Tag receipt                                                                                                                                                                  |
| GET    | `/reference-data`                                    | States, LGAs, vehicle types, enforcement points                                                                                                                                    |
| GET    | `/notifications?limit=&cursor=`                      | The agent's notifications and unread count                                                                                                                                         |
| GET    | `/notifications/unread-count`                        | `{unread}`                                                                                                                                                                         |
| POST   | `/notifications/:id/read`, `/notifications/read-all` | Mark read                                                                                                                                                                          |

**Sessions.** An access token lasts 30 minutes, and the app refreshes it with
the refresh token. A sign-in ends 24 hours after it starts, whatever is
refreshed. When CHL reports the account deactivated, every session of that
agent ends. If CHL can't be reached to ask, the agent stays signed in.

**Verifying.** `POST /verifications`:

```json
{
  "method": "plate",
  "plate": "ABC 123 AA",
  "location": { "latitude": 6.6018, "longitude": 3.3515, "accuracyMetres": 12 }
}
```

- `method` is `plate`, `qrCode` or `eTag` (with `reference`), or `rfid` (with
  `tagReference`). `location` is required.
- The answer has `outcome`: `found` (with `vehicle`, `eTag` and `trip`),
  `vehicleNotFound` or `unknownTag`. `plate` is the vehicle's plate, or the
  plate typed when CHL didn't identify one (so an unfinished check can be
  shown and retried). The raw identifier and CHL's internal IDs
  are never sent back.
- When CHL can't complete the check, the answer is **503 `CHL_UNAVAILABLE`**,
  never a result. The attempt is still recorded (`details.verificationId`) as
  not completed.
- Send an `Idempotency-Key` header to retry safely. The same key returns the
  first result (200) without asking CHL again. A CHL-unavailable attempt
  doesn't keep its key, so retrying it really retries.
- Checks made offline are sent later with `capturedAt` (up to 7 days old).
  They are recorded at that time with `syncStatus: "offline"`.

**Health.** `GET /health` answers `200` while the process runs.
`GET /health/ready` answers `200` when both CHL and the database answer,
otherwise `503`.

**Errors.** Every response carries an `X-Request-Id` header (the caller's, if
sent). Every error has the same shape. `code` is stable, so the app can rely
on it, and `message` is safe to show:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are missing or not valid.",
    "details": [{ "field": "location", "message": "…" }],
    "requestId": "…"
  }
}
```

## Environments and deployment

There is one image for every deployment; they differ only in their
settings.

|                        | Development                   | Staging                                        | Production                                                   |
| ---------------------- | ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| Where                  | This computer (`npm run dev`) | A server, for testers                          | A server, for officers                                       |
| `APP_ENV` / `NODE_ENV` | `development` / `development` | `staging` / `production`                       | `production` / `production`                                  |
| Database               | Local `iteimedb`              | Its own, never production's                    | Its own                                                      |
| CHL                    | Sample data (`mock`)          | Sample data, then CHL's test (sandbox) address | The real CHL (`http`); the server refuses to start otherwise |
| Settings               | `.env`                        | `deploy/staging.env.example`                   | `deploy/production.env.example`                              |
| Mobile app             | `--flavor dev`                | `--flavor staging`                             | `--flavor prod`                                              |

The server checks these rules at start-up:

- Staging and production need `NODE_ENV=production`.
- Production needs `CHL_ADAPTER=http`.

`/health` and `/health/ready` include `environment`, so you can always see
which deployment answered.

**Image.** `Dockerfile` builds a small image that runs as a non-root user,
with production dependencies only and a health check.

```sh
docker build -t iteime-backend .
docker run --env-file deploy/staging.env -p 4000:4000 iteime-backend
```

To try the image with its own PostgreSQL on one machine, run
`docker compose up --build` (`compose.yaml`, set up like staging).

**Deploying, for staging or production:**

1. Create the database; managed databases usually need
   `?sslmode=require` in `DATABASE_URL`.
2. Fill in the settings from `deploy/<environment>.env.example`, in the
   hosting platform's secret settings. Real `deploy/*.env` files are never
   committed.
3. Put the server behind HTTPS (a load balancer or reverse proxy), and set
   `TRUST_PROXY` to the number of proxies in front (usually `1`).
4. Run the image. It migrates the database at start-up. With the image's
   automatic migration off, run `npm run migrate:prod` before starting.
5. Point the load balancer's health check at `/health/ready`, which answers
   503 while CHL or the database is down.
6. Give the mobile team the address, ending in `/api/v1`, for
   `config/staging.json` or `config/prod.json`.

Each deployment logs JSON to standard output, for the platform's log
collector.

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
- Commit and push to `main` after each change; update this README and its
  change log in the same commit.
- Run `npm run lint`, `npm run typecheck` and `npm test` before committing.
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
