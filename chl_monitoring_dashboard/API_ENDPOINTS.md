# CHL Monitoring Dashboard — backend API

Everything the Admin Dashboard (`chl_monitoring_dashboard`) needs from the backend: 27 endpoints, in this one document. The dashboard is **read-only** — apart from signing in and out, a support email and marking notifications read, nothing here changes data, and nothing ever changes a CHL business record.

The paths, field names and shapes are what the dashboard sends and checks today, against its sample data. They are proposals: if the backend needs a different path or name, agree it and the dashboard will follow.

## Endpoints

| #   | Endpoint                                                             | Method | Path                                | Used by                                                               |
| --- | -------------------------------------------------------------------- | ------ | ----------------------------------- | --------------------------------------------------------------------- |
| 1   | [Sign in](#1-sign-in)                                                | `POST` | `/api/v1/admin/auth/sign-in`        | Sign-in page                                                          |
| 2   | [Refresh the access token](#2-refresh-the-access-token)              | `POST` | `/api/v1/admin/auth/refresh`        | Every page (automatically, when a call answers 401)                   |
| 3   | [Sign out](#3-sign-out)                                              | `POST` | `/api/v1/admin/auth/sign-out`       | Account menu → Log out                                                |
| 4   | [Send a sign-in support request](#4-send-a-sign-in-support-request)  | `POST` | `/api/v1/support/requests`          | Sign-in help page (signed out)                                        |
| 5   | [Areas (geographic hierarchy)](#5-areas-geographic-hierarchy)        | `GET`  | `/api/v1/areas`                     | The area picker on every page                                         |
| 6   | [Agents the user may see](#6-agents-the-user-may-see)                | `GET`  | `/api/v1/agents`                    | The agent and organization filters on every page                      |
| 7   | [Overview](#7-overview)                                              | `GET`  | `/api/v1/overview`                  | Overview page (document 2)                                            |
| 8   | [Command & Control Centre](#8-command--control-centre)               | `GET`  | `/api/v1/command-centre`            | Command centre page (document 3)                                      |
| 9   | [Geographical monitoring](#9-geographical-monitoring)                | `GET`  | `/api/v1/geography`                 | Geographical monitoring page (document 4)                             |
| 10  | [Agents & organizations](#10-agents--organizations)                  | `GET`  | `/api/v1/agents/monitoring`         | Agents & organizations page (document 5)                              |
| 11  | [One agent's activity](#11-one-agents-activity)                      | `GET`  | `/api/v1/agents/{agentId}/activity` | An agent's page (/agents/{agentId})                                   |
| 12  | [Verifications & E-Tags](#12-verifications--e-tags)                  | `GET`  | `/api/v1/verifications/monitoring`  | Verifications & E-Tags page (document 6); Vehicle identity            |
| 13  | [CHL trip monitoring](#13-chl-trip-monitoring)                       | `GET`  | `/api/v1/trips/monitoring`          | Trip monitoring page (document 7)                                     |
| 14  | [Cases needing attention (count)](#14-cases-needing-attention-count) | `GET`  | `/api/v1/violations/summary`        | Sidebar dot on Violations & cases (every page, refreshed each minute) |
| 15  | [Violations & cases](#15-violations--cases)                          | `GET`  | `/api/v1/violations/monitoring`     | Violations & cases page (document 8)                                  |
| 16  | [Evidence records](#16-evidence-records)                             | `GET`  | `/api/v1/evidence/monitoring`       | Evidence records page (document 9)                                    |
| 17  | [Field reports](#17-field-reports)                                   | `GET`  | `/api/v1/field-reports`             | Field reports page                                                    |
| 18  | [Demand notices & payments](#18-demand-notices--payments)            | `GET`  | `/api/v1/payments/monitoring`       | Payments & compliance page (document 10)                              |
| 19  | [Unread notifications (top bar)](#19-unread-notifications-top-bar)   | `GET`  | `/api/v1/notifications/summary`     | The bell in the top bar (every page, refreshed each minute)           |
| 20  | [Notifications](#20-notifications)                                   | `GET`  | `/api/v1/notifications`             | Notifications page (document 11)                                      |
| 21  | [Mark notifications as read](#21-mark-notifications-as-read)         | `POST` | `/api/v1/notifications/read`        | Notifications page and the bell                                       |
| 22  | [Repeat vehicle alerts](#22-repeat-vehicle-alerts)                   | `GET`  | `/api/v1/repeat-alerts`             | Repeat vehicle alerts page (document 11)                              |
| 23  | [Verification history](#23-verification-history)                     | `GET`  | `/api/v1/verification-history`      | Verification history page (document 12.1)                             |
| 24  | [Audit trail](#24-audit-trail)                                       | `GET`  | `/api/v1/audit-trail`               | Audit trail page (document 12.2)                                      |
| 25  | [Synchronization](#25-synchronization)                               | `GET`  | `/api/v1/synchronization`           | Synchronization page (document 13)                                    |
| 26  | [Field operational status](#26-field-operational-status)             | `GET`  | `/api/v1/field-status`              | Field operational status page (document 13)                           |
| 27  | [Search](#27-search)                                                 | `GET`  | `/api/v1/search`                    | Search results page (top bar search)                                  |

## Conventions

- **Base URL:** set in the dashboard by `VITE_API_BASE_URL`; every path starts with `/api/v1`.
- **Format:** JSON in and out (`Content-Type: application/json`). Times are ISO 8601 with an offset (`2026-11-03T10:33:00.000+01:00`); calendar days are `YYYY-MM-DD` in Africa/Lagos time.
- **Sign-in:** every endpoint except sign-in, refresh and the support request needs `Authorization: Bearer <access token>`. On `401` the dashboard calls _Refresh_ once and retries.
- **Checked answers:** the dashboard checks every answer against the fields in these documents. A missing required field, or a wrong type, shows "The server sent an answer we could not read" instead of the page — so send every required field, using `null` where a document says it can be null.
- **Access:** filter all data to the user's areas (`user.scopes`) and modules (`user.modules`). A `scope` outside the user's areas, or a module they may not open, answers `403`.
- **Period:** list endpoints take `scope`, `range`, `from` and `to`; `from` and `to` are always sent, so they can be used as they are. Most also take `agent` and `organization`.
- **Shared IDs:** a location's `id`, an agent's `agentId` and a record's reference must be the same in every endpoint that returns them. The dashboard joins records across endpoints by these IDs: for example, the location popup on Evidence records finds `records[].location.id` in the Overview's `locations[]`.
- **Timeout:** the dashboard gives up after 20 seconds.
- **Never send** raw RFID tag values, and never present a last-reported state (device status, GPS) as current.

## Errors

Every error answer uses one body, so the dashboard can show the right message:

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "The email or password is incorrect.",
    "requestId": "req_8f2c1a"
  }
}
```

- `code` — a stable, machine-readable code (the dashboard reacts to `invalid_credentials` and `account_deactivated` at sign-in).
- `message` — a sentence the user can read; never stack traces or internal details.
- `requestId` — optional; shown to the user so support can find the request.

## Endpoint details

### 1. Sign in

`POST /api/v1/admin/auth/sign-in`

Signs a dashboard user in through the existing CHL authentication and returns the session: tokens, the user, their role, areas and the modules they may open.

- **Used by:** Sign-in page
- **Sign-in:** not required (no `Authorization` header is sent)
- **Changes CHL data:** no

#### Request body (JSON)

| Field      | Type           | Required | Can be null |
| ---------- | -------------- | -------- | ----------- |
| `email`    | string (email) | yes      | no          |
| `password` | string         | yes      | no          |

Example:

```json
{
  "email": "admin@jrb.gov.ng",
  "password": "••••••••"
}
```

#### Response

`200 OK`, JSON:

| Field                 | Type                                                                                           | Required | Can be null |
| --------------------- | ---------------------------------------------------------------------------------------------- | -------- | ----------- |
| `accessToken`         | string                                                                                         | yes      | no          |
| `refreshToken`        | string                                                                                         | yes      | no          |
| `user`                | object                                                                                         | yes      | no          |
| `user.id`             | string                                                                                         | yes      | no          |
| `user.name`           | string                                                                                         | yes      | no          |
| `user.email`          | string                                                                                         | yes      | no          |
| `user.role`           | one of: `administrator`, `supervisor`, `principal_officer`                                     | yes      | no          |
| `user.organization`   | string                                                                                         | yes      | yes         |
| `user.scopes`         | array of objects                                                                               | yes      | no          |
| `user.scopes[].level` | one of: `enforcement_point`, `zone`, `ward`, `lga`, `state`, `region`, `subregion`, `national` | yes      | no          |
| `user.scopes[].id`    | string                                                                                         | yes      | no          |
| `user.scopes[].name`  | string                                                                                         | yes      | no          |
| `user.modules`        | string (coded value) — see _Module key_                                                        | yes      | no          |
| `expiresAt`           | string (ISO 8601 date-time)                                                                    | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "accessToken": "<access token>",
  "refreshToken": "<refresh token>",
  "user": {
    "id": "usr_admin",
    "name": "Adaeze Okafor",
    "email": "admin@jrb.gov.ng",
    "role": "administrator",
    "organization": "Joint Revenue Board",
    "scopes": [
      {
        "level": "national",
        "id": "ng",
        "name": "Nigeria"
      }
    ],
    "modules": ["overview", "command-centre"]
  },
  "expiresAt": "2026-11-05T09:00:00.000+01:00"
}
```

#### Errors

- `401` with code `invalid_credentials` — wrong email or password.
- `403` with code `account_deactivated` — the CHL account is deactivated. Only return this once the password is right, so the answer never reveals which accounts exist.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- `user.modules` decides which sidebar modules the user sees; any other module shows "No access". Keys: see _Module key_.
- `user.scopes` are the user's areas from CHL. Every other endpoint must filter its data to them.
- `expiresAt` is the end of the session (the dashboard uses 24 hours, like the mobile app). Refreshing does not move it.
- Passwords are not reset here: the dashboard sends users to CHL to reset them.

[↑ Back to the list](#endpoints)

---

### 2. Refresh the access token

`POST /api/v1/admin/auth/refresh`

Returns new tokens for the same session. The dashboard calls it when any request answers `401`, then retries that request once.

- **Used by:** Every page (automatically, when a call answers 401)
- **Sign-in:** not required (no `Authorization` header is sent)
- **Changes CHL data:** no

#### Request body (JSON)

| Field          | Type   | Required | Can be null |
| -------------- | ------ | -------- | ----------- |
| `refreshToken` | string | yes      | no          |

Example:

```json
{
  "refreshToken": "<refresh token>"
}
```

#### Response

`200 OK`, JSON:

| Field          | Type   | Required | Can be null |
| -------------- | ------ | -------- | ----------- |
| `accessToken`  | string | yes      | no          |
| `refreshToken` | string | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "accessToken": "<new access token>",
  "refreshToken": "<new refresh token>"
}
```

#### Errors

- `401` — the refresh token is invalid or the session has ended; the dashboard signs the user out ("Session expired").
- Every error uses the shared error body: see [README](#errors).

[↑ Back to the list](#endpoints)

---

### 3. Sign out

`POST /api/v1/admin/auth/sign-out`

Ends the session on the server. The dashboard signs the user out at once and does not wait for this answer.

- **Used by:** Account menu → Log out
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Request body (JSON)

| Field          | Type   | Required | Can be null |
| -------------- | ------ | -------- | ----------- |
| `refreshToken` | string | yes      | no          |

Example:

```json
{
  "refreshToken": "<refresh token>"
}
```

#### Response

Any 2xx answer; the body is ignored (`204 No Content` is fine).

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

[↑ Back to the list](#endpoints)

---

### 4. Send a sign-in support request

`POST /api/v1/support/requests`

Sends a signed-out user's sign-in or access problem to CHL support by email.

- **Used by:** Sign-in help page (signed out)
- **Sign-in:** not required (no `Authorization` header is sent)
- **Changes CHL data:** no

#### Request body (JSON)

| Field       | Type                                                              | Required | Can be null |
| ----------- | ----------------------------------------------------------------- | -------- | ----------- |
| `fullName`  | string                                                            | yes      | no          |
| `email`     | string (email)                                                    | yes      | no          |
| `issueType` | one of: `cant_sign_in`, `account_locked`, `wrong_access`, `other` | yes      | no          |
| `message`   | string                                                            | yes      | no          |

Example:

```json
{
  "fullName": "Ngozi Eze",
  "email": "ngozi@example.com",
  "issueType": "cant_sign_in",
  "message": "I cannot sign in since this morning."
}
```

#### Response

Any 2xx answer; the body is ignored.

#### Errors

- Every error uses the shared error body: see [README](#errors).

#### Notes

- `issueType` is one of `cant_sign_in`, `account_locked`, `wrong_access`, `other`. `fullName` is at most 120 characters, `message` at most 2000.
- Consider rate-limiting this endpoint: it needs no sign-in.

[↑ Back to the list](#endpoints)

---

### 5. Areas (geographic hierarchy)

`GET /api/v1/areas`

CHL's area tree that the user may see: their own areas and everything under them (national, region, subregion, state, LGA, ward, zone, enforcement point).

- **Used by:** The area picker on every page
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Response

`200 OK`, JSON:

The body is a JSON **array**; each item:

| Field           | Type                                                                                           | Required | Can be null |
| --------------- | ---------------------------------------------------------------------------------------------- | -------- | ----------- |
| `[][].id`       | string                                                                                         | yes      | no          |
| `[][].name`     | string                                                                                         | yes      | no          |
| `[][].level`    | one of: `enforcement_point`, `zone`, `ward`, `lga`, `state`, `region`, `subregion`, `national` | yes      | no          |
| `[][].parentId` | string                                                                                         | yes      | yes         |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
[
  {
    "id": "ng",
    "name": "Nigeria",
    "level": "national",
    "parentId": null
  },
  {
    "id": "sw",
    "name": "South West",
    "level": "region",
    "parentId": "ng"
  }
]
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- The `scope` query parameter on other endpoints takes these ids.

[↑ Back to the list](#endpoints)

---

### 6. Agents the user may see

`GET /api/v1/agents`

Every agent the user may see, with their vendor / organization.

- **Used by:** The agent and organization filters on every page
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Response

`200 OK`, JSON:

The body is a JSON **array**; each item:

| Field               | Type   | Required | Can be null |
| ------------------- | ------ | -------- | ----------- |
| `[][].id`           | string | yes      | no          |
| `[][].name`         | string | yes      | no          |
| `[][].organization` | string | yes      | yes         |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
[
  {
    "id": "JRB-AG-0142",
    "name": "Tunde Okafor",
    "organization": "Zone 1"
  },
  {
    "id": "JRB-AG-0143",
    "name": "Grace Bello",
    "organization": "Zone 1"
  }
]
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Agents are matched by `id`, never by name.

[↑ Back to the list](#endpoints)

---

### 7. Overview

`GET /api/v1/overview`

The headline figures, results by outcome, violations by agent, activity by location, cases needing attention, repeat vehicles and recent activity for an area and period.

- **Used by:** Overview page (document 2)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                                | Type                                                                        | Required | Can be null |
| ------------------------------------ | --------------------------------------------------------------------------- | -------- | ----------- |
| `period`                             | object                                                                      | yes      | no          |
| `period.from`                        | string (calendar day, YYYY-MM-DD)                                           | yes      | no          |
| `period.to`                          | string (calendar day, YYYY-MM-DD)                                           | yes      | no          |
| `reportingLocations`                 | integer (0 or more)                                                         | yes      | no          |
| `latestReceivedAt`                   | string                                                                      | yes      | yes         |
| `kpis`                               | object                                                                      | yes      | no          |
| `kpis.totalVerifications`            | integer (0 or more)                                                         | yes      | no          |
| `kpis.activeTripResults`             | integer (0 or more)                                                         | yes      | no          |
| `kpis.noActiveTripResults`           | integer (0 or more)                                                         | yes      | no          |
| `kpis.violationsIssued`              | integer (0 or more)                                                         | yes      | no          |
| `kpis.agentsWithViolations`          | integer (0 or more)                                                         | yes      | no          |
| `kpis.unresolvedViolations`          | integer (0 or more)                                                         | yes      | no          |
| `kpis.escalatedViolations`           | integer (0 or more)                                                         | yes      | no          |
| `kpis.repeatVehiclesWithoutFollowUp` | integer (0 or more)                                                         | yes      | no          |
| `kpis.openRepeatAlerts`              | integer (0 or more)                                                         | yes      | no          |
| `kpis.agentsWithActivity`            | integer (0 or more)                                                         | yes      | no          |
| `kpis.enforcementLocations`          | integer (0 or more)                                                         | yes      | no          |
| `attempts`                           | object                                                                      | yes      | no          |
| `attempts.completed`                 | integer (0 or more)                                                         | yes      | no          |
| `attempts.notCompleted`              | integer (0 or more)                                                         | yes      | no          |
| `dailyVerifications`                 | array of objects                                                            | yes      | no          |
| `dailyVerifications[].date`          | string (calendar day, YYYY-MM-DD)                                           | yes      | no          |
| `dailyVerifications[].count`         | integer (0 or more)                                                         | yes      | no          |
| `previousDailyVerifications`         | array of integer (0 or more)                                                | yes      | yes         |
| `outcomes`                           | array of objects                                                            | yes      | no          |
| `outcomes[].outcome`                 | string (coded value) — see _Verification outcome_                           | yes      | no          |
| `outcomes[].count`                   | integer (0 or more)                                                         | yes      | no          |
| `agents`                             | array of objects                                                            | yes      | no          |
| `agents[].agentId`                   | string                                                                      | yes      | no          |
| `agents[].name`                      | string                                                                      | yes      | no          |
| `agents[].organization`              | string                                                                      | yes      | no          |
| `agents[].verifications`             | integer (0 or more)                                                         | yes      | no          |
| `agents[].violationsIssued`          | integer (0 or more)                                                         | yes      | no          |
| `agents[].unresolved`                | integer (0 or more)                                                         | yes      | no          |
| `agents[].escalated`                 | integer (0 or more)                                                         | yes      | no          |
| `agents[].repeatAlerts`              | integer (0 or more)                                                         | yes      | no          |
| `agents[].locations`                 | string                                                                      | yes      | no          |
| `locations`                          | array of objects                                                            | yes      | no          |
| `locations[].id`                     | string                                                                      | yes      | no          |
| `locations[].name`                   | string                                                                      | yes      | no          |
| `locations[].area`                   | string                                                                      | yes      | no          |
| `locations[].code`                   | string                                                                      | yes      | no          |
| `locations[].agents`                 | integer (0 or more)                                                         | yes      | no          |
| `locations[].verifications`          | integer (0 or more)                                                         | yes      | no          |
| `locations[].violationsIssued`       | integer (0 or more)                                                         | yes      | no          |
| `locations[].unresolved`             | integer (0 or more)                                                         | yes      | no          |
| `locations[].escalated`              | integer (0 or more)                                                         | yes      | no          |
| `locations[].repeatAlerts`           | integer (0 or more)                                                         | yes      | no          |
| `methods`                            | array of objects                                                            | yes      | no          |
| `methods[].method`                   | string (coded value) — see _Verification method_                            | yes      | no          |
| `methods[].count`                    | integer (0 or more)                                                         | yes      | no          |
| `etagResults`                        | array of objects                                                            | yes      | no          |
| `etagResults[].result`               | string (coded value) — see _Verification outcome_                           | yes      | no          |
| `etagResults[].count`                | integer (0 or more)                                                         | yes      | no          |
| `violationCategories`                | array of objects                                                            | yes      | no          |
| `violationCategories[].category`     | string                                                                      | yes      | no          |
| `violationCategories[].count`        | integer (0 or more)                                                         | yes      | no          |
| `payments`                           | object                                                                      | yes      | no          |
| `payments.received`                  | integer (0 or more)                                                         | yes      | no          |
| `payments.pending`                   | integer (0 or more)                                                         | yes      | no          |
| `payments.tripActivatedOnPaid`       | integer (0 or more)                                                         | yes      | no          |
| `cases`                              | object                                                                      | yes      | no          |
| `cases.unresolved`                   | integer (0 or more)                                                         | yes      | no          |
| `cases.escalated`                    | integer (0 or more)                                                         | yes      | no          |
| `cases.items`                        | array of objects                                                            | yes      | no          |
| `cases.items[].id`                   | string                                                                      | yes      | no          |
| `cases.items[].plate`                | string                                                                      | yes      | no          |
| `cases.items[].category`             | string                                                                      | yes      | no          |
| `cases.items[].status`               | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `cases.items[].area`                 | string                                                                      | yes      | no          |
| `repeatVehicles`                     | object                                                                      | yes      | no          |
| `repeatVehicles.open`                | integer (0 or more)                                                         | yes      | no          |
| `repeatVehicles.withoutFollowUp`     | integer (0 or more)                                                         | yes      | no          |
| `repeatVehicles.items`               | array of objects                                                            | yes      | no          |
| `repeatVehicles.items[].plate`       | string                                                                      | yes      | no          |
| `repeatVehicles.items[].reports`     | integer (0 or more)                                                         | yes      | no          |
| `repeatVehicles.items[].agents`      | integer (0 or more)                                                         | yes      | no          |
| `repeatVehicles.items[].area`        | string                                                                      | yes      | no          |
| `repeatVehicles.items[].followUp`    | string (coded value) — see _Follow-up_                                      | yes      | no          |
| `recentActivity`                     | array of objects                                                            | yes      | no          |
| `recentActivity[].id`                | string                                                                      | yes      | no          |
| `recentActivity[].plate`             | string                                                                      | yes      | no          |
| `recentActivity[].reference`         | string                                                                      | yes      | no          |
| `recentActivity[].method`            | string (coded value) — see _Verification method_                            | yes      | yes         |
| `recentActivity[].result`            | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `recentActivity[].agent`             | object                                                                      | yes      | no          |
| `recentActivity[].agent.id`          | string                                                                      | yes      | no          |
| `recentActivity[].agent.name`        | string                                                                      | yes      | no          |
| `recentActivity[].recordedAt`        | string                                                                      | yes      | no          |
| `recentActivity[].actionStatus`      | string (coded value) — see _Case status_                                    | yes      | no          |
| `recentActivity[].location`          | object                                                                      | yes      | no          |
| `recentActivity[].location.name`     | string                                                                      | yes      | no          |
| `recentActivity[].location.area`     | string                                                                      | yes      | no          |
| `recentActivity[].location.code`     | string                                                                      | yes      | no          |
| `recentActivity[].source`            | string (coded value) — see _Record source_                                  | yes      | yes         |
| `recentActivity[].syncStatus`        | string (coded value) — see _Sync status_                                    | yes      | yes         |
| `recentActivity[].receivedAt`        | string                                                                      | yes      | yes         |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "period": {
    "from": "2026-10-11",
    "to": "2026-10-24"
  },
  "reportingLocations": 3,
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "kpis": {
    "totalVerifications": 12,
    "activeTripResults": 2,
    "noActiveTripResults": 4,
    "violationsIssued": 8,
    "agentsWithViolations": 2,
    "unresolvedViolations": 8,
    "escalatedViolations": 0,
    "repeatVehiclesWithoutFollowUp": 1,
    "openRepeatAlerts": 1,
    "agentsWithActivity": 2,
    "enforcementLocations": 3
  },
  "attempts": {
    "completed": 12,
    "notCompleted": 0
  },
  "dailyVerifications": [
    {
      "date": "2026-10-11",
      "count": 0
    },
    {
      "date": "2026-10-12",
      "count": 0
    }
  ],
  "previousDailyVerifications": null,
  "outcomes": [
    {
      "outcome": "active_trip",
      "count": 2
    },
    {
      "outcome": "vehicle_not_found",
      "count": 1
    }
  ],
  "agents": [
    {
      "agentId": "JRB-AG-0142",
      "name": "Tunde Okafor",
      "organization": "Zone 1",
      "verifications": 8,
      "violationsIssued": 6,
      "unresolved": 6,
      "escalated": 0,
      "repeatAlerts": 1,
      "locations": "Lagos"
    },
    {
      "agentId": "JRB-AG-0145",
      "name": "Ada Nwosu",
      "organization": "Zone 2",
      "verifications": 4,
      "violationsIssued": 2,
      "unresolved": 2,
      "escalated": 0,
      "repeatAlerts": 0,
      "locations": "Lagos"
    }
  ],
  "locations": [
    {
      "id": "loc_ojota",
      "name": "Ojota enforcement point",
      "area": "Lagos",
      "code": "LOS-04",
      "agents": 1,
      "verifications": 3,
      "violationsIssued": 1,
      "unresolved": 1,
      "escalated": 0,
      "repeatAlerts": 0
    },
    {
      "id": "loc_ikeja_gate",
      "name": "Ikeja Gate 3",
      "area": "Lagos",
      "code": "LOS-01",
      "agents": 1,
      "verifications": 5,
      "violationsIssued": 5,
      "unresolved": 5,
      "escalated": 0,
      "repeatAlerts": 1
    }
  ],
  "methods": [
    {
      "method": "rfid",
      "count": 4
    },
    {
      "method": "qr",
      "count": 4
    }
  ],
  "etagResults": [
    {
      "result": "valid",
      "count": 4
    },
    {
      "result": "missing",
      "count": 1
    }
  ],
  "violationCategories": [
    {
      "category": "No Active CHL Trip",
      "count": 4
    },
    {
      "category": "Expired Trip",
      "count": 2
    }
  ],
  "payments": {
    "received": 0,
    "pending": 6,
    "tripActivatedOnPaid": 0
  },
  "cases": {
    "unresolved": 8,
    "escalated": 0,
    "items": [
      {
        "id": "VIO-30280",
        "plate": "KJA-482-XY",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "area": "Lagos"
      },
      {
        "id": "VIO-30279",
        "plate": "PHC-338-MN",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "area": "Lagos"
      }
    ]
  },
  "repeatVehicles": {
    "open": 1,
    "withoutFollowUp": 1,
    "items": [
      {
        "plate": "KJA-482-XY",
        "reports": 3,
        "agents": 1,
        "area": "Lagos",
        "followUp": "none"
      }
    ]
  },
  "recentActivity": [
    {
      "id": "rec_151",
      "plate": "KJA-482-XY",
      "reference": "VR-24150",
      "method": "ocr",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "recordedAt": "2026-10-24T10:40:00.550Z",
      "actionStatus": "payment_pending",
      "location": {
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "source": "live",
      "syncStatus": "synced",
      "receivedAt": "2026-10-24T10:40:30.550Z"
    },
    {
      "id": "rec_150",
      "plate": "PHC-338-MN",
      "reference": "VR-24149",
      "method": "rfid",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "recordedAt": "2026-10-24T10:20:00.550Z",
      "actionStatus": "payment_pending",
      "location": {
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "source": "live",
      "syncStatus": "synced",
      "receivedAt": "2026-10-24T10:20:30.550Z"
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- `latestReceivedAt` is when CHL last received a field record in the area — field data can be delayed, so it is not "now".

[↑ Back to the list](#endpoints)

---

### 8. Command & Control Centre

`GET /api/v1/command-centre`

The live activity feed, cases needing attention, SOS, field reports, loaded / empty confirmations and incident context for an area over a recent window.

- **Used by:** Command centre page (document 3)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name     | Required | Meaning                                                                                            |
| -------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`  | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `window` | yes      | One of `1h`, `today`, `24h`, `7d`; the window ends now.                                            |

#### Response

`200 OK`, JSON:

| Field                                        | Type                                                                                       | Required | Can be null |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- | ----------- |
| `window`                                     | object                                                                                     | yes      | no          |
| `window.from`                                | string                                                                                     | yes      | no          |
| `window.to`                                  | string                                                                                     | yes      | no          |
| `latestReceivedAt`                           | string                                                                                     | yes      | yes         |
| `counts`                                     | object                                                                                     | yes      | no          |
| `counts.activity`                            | integer (0 or more)                                                                        | yes      | no          |
| `feed`                                       | array of objects                                                                           | yes      | no          |
| `feed[].id`                                  | string                                                                                     | yes      | no          |
| `feed[].kind`                                | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `feed[].recordedAt`                          | string                                                                                     | yes      | no          |
| `feed[].receivedAt`                          | string                                                                                     | yes      | yes         |
| `feed[].source`                              | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `feed[].syncStatus`                          | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `feed[].agent`                               | object                                                                                     | yes      | no          |
| `feed[].agent.id`                            | string                                                                                     | yes      | no          |
| `feed[].agent.name`                          | string                                                                                     | yes      | no          |
| `feed[].location`                            | object                                                                                     | yes      | no          |
| `feed[].location.name`                       | string                                                                                     | yes      | no          |
| `feed[].location.area`                       | string                                                                                     | yes      | no          |
| `feed[].location.code`                       | string                                                                                     | yes      | no          |
| `feed[].plate`                               | string                                                                                     | yes      | yes         |
| `feed[].result`                              | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `feed[].violation`                           | object                                                                                     | yes      | yes         |
| `feed[].violation.id`                        | string                                                                                     | yes      | no          |
| `feed[].violation.category`                  | string                                                                                     | yes      | no          |
| `feed[].violation.status`                    | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `feed[].payment`                             | object                                                                                     | yes      | yes         |
| `feed[].payment.noticeId`                    | string                                                                                     | yes      | no          |
| `feed[].payment.status`                      | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `feed[].payment.tripActivated`               | boolean                                                                                    | yes      | no          |
| `feed[].report`                              | object                                                                                     | yes      | yes         |
| `feed[].report.type`                         | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `feed[].report.summary`                      | string                                                                                     | yes      | no          |
| `feed[].load`                                | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `feed[].sos`                                 | object                                                                                     | yes      | yes         |
| `feed[].sos.status`                          | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `feed[].sos.type`                            | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `feed[].sos.message`                         | string                                                                                     | yes      | yes         |
| `feed[].sos.closedAt`                        | string                                                                                     | yes      | yes         |
| `feed[].evidenceCount`                       | integer (0 or more)                                                                        | yes      | no          |
| `feed[].note`                                | string                                                                                     | yes      | yes         |
| `fieldReports`                               | object                                                                                     | yes      | no          |
| `fieldReports.total`                         | integer (0 or more)                                                                        | yes      | no          |
| `fieldReports.byType`                        | array of objects                                                                           | yes      | no          |
| `fieldReports.byType[].type`                 | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `fieldReports.byType[].count`                | integer (0 or more)                                                                        | yes      | no          |
| `fieldReports.items`                         | array of objects                                                                           | yes      | no          |
| `fieldReports.items[].id`                    | string                                                                                     | yes      | no          |
| `fieldReports.items[].kind`                  | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `fieldReports.items[].recordedAt`            | string                                                                                     | yes      | no          |
| `fieldReports.items[].receivedAt`            | string                                                                                     | yes      | yes         |
| `fieldReports.items[].source`                | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `fieldReports.items[].syncStatus`            | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `fieldReports.items[].agent`                 | object                                                                                     | yes      | no          |
| `fieldReports.items[].agent.id`              | string                                                                                     | yes      | no          |
| `fieldReports.items[].agent.name`            | string                                                                                     | yes      | no          |
| `fieldReports.items[].location`              | object                                                                                     | yes      | no          |
| `fieldReports.items[].location.name`         | string                                                                                     | yes      | no          |
| `fieldReports.items[].location.area`         | string                                                                                     | yes      | no          |
| `fieldReports.items[].location.code`         | string                                                                                     | yes      | no          |
| `fieldReports.items[].plate`                 | string                                                                                     | yes      | yes         |
| `fieldReports.items[].result`                | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `fieldReports.items[].violation`             | object                                                                                     | yes      | yes         |
| `fieldReports.items[].violation.id`          | string                                                                                     | yes      | no          |
| `fieldReports.items[].violation.category`    | string                                                                                     | yes      | no          |
| `fieldReports.items[].violation.status`      | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `fieldReports.items[].payment`               | object                                                                                     | yes      | yes         |
| `fieldReports.items[].payment.noticeId`      | string                                                                                     | yes      | no          |
| `fieldReports.items[].payment.status`        | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `fieldReports.items[].payment.tripActivated` | boolean                                                                                    | yes      | no          |
| `fieldReports.items[].report`                | object                                                                                     | yes      | yes         |
| `fieldReports.items[].report.type`           | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `fieldReports.items[].report.summary`        | string                                                                                     | yes      | no          |
| `fieldReports.items[].load`                  | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `fieldReports.items[].sos`                   | object                                                                                     | yes      | yes         |
| `fieldReports.items[].sos.status`            | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `fieldReports.items[].sos.type`              | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `fieldReports.items[].sos.message`           | string                                                                                     | yes      | yes         |
| `fieldReports.items[].sos.closedAt`          | string                                                                                     | yes      | yes         |
| `fieldReports.items[].evidenceCount`         | integer (0 or more)                                                                        | yes      | no          |
| `fieldReports.items[].note`                  | string                                                                                     | yes      | yes         |
| `loadReports`                                | object                                                                                     | yes      | no          |
| `loadReports.loaded`                         | integer (0 or more)                                                                        | yes      | no          |
| `loadReports.empty`                          | integer (0 or more)                                                                        | yes      | no          |
| `loadReports.items`                          | array of objects                                                                           | yes      | no          |
| `loadReports.items[].id`                     | string                                                                                     | yes      | no          |
| `loadReports.items[].kind`                   | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `loadReports.items[].recordedAt`             | string                                                                                     | yes      | no          |
| `loadReports.items[].receivedAt`             | string                                                                                     | yes      | yes         |
| `loadReports.items[].source`                 | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `loadReports.items[].syncStatus`             | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `loadReports.items[].agent`                  | object                                                                                     | yes      | no          |
| `loadReports.items[].agent.id`               | string                                                                                     | yes      | no          |
| `loadReports.items[].agent.name`             | string                                                                                     | yes      | no          |
| `loadReports.items[].location`               | object                                                                                     | yes      | no          |
| `loadReports.items[].location.name`          | string                                                                                     | yes      | no          |
| `loadReports.items[].location.area`          | string                                                                                     | yes      | no          |
| `loadReports.items[].location.code`          | string                                                                                     | yes      | no          |
| `loadReports.items[].plate`                  | string                                                                                     | yes      | yes         |
| `loadReports.items[].result`                 | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `loadReports.items[].violation`              | object                                                                                     | yes      | yes         |
| `loadReports.items[].violation.id`           | string                                                                                     | yes      | no          |
| `loadReports.items[].violation.category`     | string                                                                                     | yes      | no          |
| `loadReports.items[].violation.status`       | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `loadReports.items[].payment`                | object                                                                                     | yes      | yes         |
| `loadReports.items[].payment.noticeId`       | string                                                                                     | yes      | no          |
| `loadReports.items[].payment.status`         | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `loadReports.items[].payment.tripActivated`  | boolean                                                                                    | yes      | no          |
| `loadReports.items[].report`                 | object                                                                                     | yes      | yes         |
| `loadReports.items[].report.type`            | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `loadReports.items[].report.summary`         | string                                                                                     | yes      | no          |
| `loadReports.items[].load`                   | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `loadReports.items[].sos`                    | object                                                                                     | yes      | yes         |
| `loadReports.items[].sos.status`             | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `loadReports.items[].sos.type`               | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `loadReports.items[].sos.message`            | string                                                                                     | yes      | yes         |
| `loadReports.items[].sos.closedAt`           | string                                                                                     | yes      | yes         |
| `loadReports.items[].evidenceCount`          | integer (0 or more)                                                                        | yes      | no          |
| `loadReports.items[].note`                   | string                                                                                     | yes      | yes         |
| `sos`                                        | object                                                                                     | yes      | yes         |
| `sos.open`                                   | integer (0 or more)                                                                        | yes      | no          |
| `sos.items`                                  | array of objects                                                                           | yes      | no          |
| `sos.items[].id`                             | string                                                                                     | yes      | no          |
| `sos.items[].kind`                           | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `sos.items[].recordedAt`                     | string                                                                                     | yes      | no          |
| `sos.items[].receivedAt`                     | string                                                                                     | yes      | yes         |
| `sos.items[].source`                         | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `sos.items[].syncStatus`                     | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `sos.items[].agent`                          | object                                                                                     | yes      | no          |
| `sos.items[].agent.id`                       | string                                                                                     | yes      | no          |
| `sos.items[].agent.name`                     | string                                                                                     | yes      | no          |
| `sos.items[].location`                       | object                                                                                     | yes      | no          |
| `sos.items[].location.name`                  | string                                                                                     | yes      | no          |
| `sos.items[].location.area`                  | string                                                                                     | yes      | no          |
| `sos.items[].location.code`                  | string                                                                                     | yes      | no          |
| `sos.items[].plate`                          | string                                                                                     | yes      | yes         |
| `sos.items[].result`                         | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `sos.items[].violation`                      | object                                                                                     | yes      | yes         |
| `sos.items[].violation.id`                   | string                                                                                     | yes      | no          |
| `sos.items[].violation.category`             | string                                                                                     | yes      | no          |
| `sos.items[].violation.status`               | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `sos.items[].payment`                        | object                                                                                     | yes      | yes         |
| `sos.items[].payment.noticeId`               | string                                                                                     | yes      | no          |
| `sos.items[].payment.status`                 | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `sos.items[].payment.tripActivated`          | boolean                                                                                    | yes      | no          |
| `sos.items[].report`                         | object                                                                                     | yes      | yes         |
| `sos.items[].report.type`                    | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `sos.items[].report.summary`                 | string                                                                                     | yes      | no          |
| `sos.items[].load`                           | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `sos.items[].sos`                            | object                                                                                     | yes      | yes         |
| `sos.items[].sos.status`                     | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `sos.items[].sos.type`                       | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `sos.items[].sos.message`                    | string                                                                                     | yes      | yes         |
| `sos.items[].sos.closedAt`                   | string                                                                                     | yes      | yes         |
| `sos.items[].evidenceCount`                  | integer (0 or more)                                                                        | yes      | no          |
| `sos.items[].note`                           | string                                                                                     | yes      | yes         |
| `cases`                                      | object                                                                                     | yes      | no          |
| `cases.unresolved`                           | integer (0 or more)                                                                        | yes      | no          |
| `cases.escalated`                            | integer (0 or more)                                                                        | yes      | no          |
| `cases.items`                                | array of objects                                                                           | yes      | no          |
| `cases.items[].id`                           | string                                                                                     | yes      | no          |
| `cases.items[].plate`                        | string                                                                                     | yes      | no          |
| `cases.items[].category`                     | string                                                                                     | yes      | no          |
| `cases.items[].status`                       | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `cases.items[].area`                         | string                                                                                     | yes      | no          |
| `repeatVehicles`                             | object                                                                                     | yes      | no          |
| `repeatVehicles.open`                        | integer (0 or more)                                                                        | yes      | no          |
| `repeatVehicles.withoutFollowUp`             | integer (0 or more)                                                                        | yes      | no          |
| `repeatVehicles.items`                       | array of objects                                                                           | yes      | no          |
| `repeatVehicles.items[].plate`               | string                                                                                     | yes      | no          |
| `repeatVehicles.items[].reports`             | integer (0 or more)                                                                        | yes      | no          |
| `repeatVehicles.items[].agents`              | integer (0 or more)                                                                        | yes      | no          |
| `repeatVehicles.items[].area`                | string                                                                                     | yes      | no          |
| `repeatVehicles.items[].followUp`            | string (coded value) — see _Follow-up_                                                     | yes      | no          |
| `locations`                                  | array of objects                                                                           | yes      | no          |
| `locations[].id`                             | string                                                                                     | yes      | no          |
| `locations[].name`                           | string                                                                                     | yes      | no          |
| `locations[].area`                           | string                                                                                     | yes      | no          |
| `locations[].code`                           | string                                                                                     | yes      | no          |
| `locations[].events`                         | integer (0 or more)                                                                        | yes      | no          |
| `locations[].lastEventAt`                    | string                                                                                     | yes      | yes         |
| `locations[].position`                       | object                                                                                     | yes      | yes         |
| `locations[].position.lat`                   | number                                                                                     | yes      | no          |
| `locations[].position.lng`                   | number                                                                                     | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "window": {
    "from": "2026-10-23T11:00:00.581Z",
    "to": "2026-10-24T11:00:00.581Z"
  },
  "latestReceivedAt": "2026-10-24T10:46:00.550Z",
  "counts": {
    "activity": 18
  },
  "feed": [
    {
      "id": "pay-DN-30280-issued",
      "kind": "payment",
      "recordedAt": "2026-10-24T10:46:00.550Z",
      "receivedAt": "2026-10-24T10:46:00.550Z",
      "source": null,
      "syncStatus": null,
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "plate": "KJA-482-XY",
      "result": null,
      "violation": null,
      "payment": {
        "noticeId": "DN-30280",
        "status": "pending",
        "tripActivated": false
      },
      "report": null,
      "load": null,
      "sos": null,
      "evidenceCount": 0,
      "note": null
    },
    {
      "id": "vio-VIO-30280",
      "kind": "violation",
      "recordedAt": "2026-10-24T10:43:00.550Z",
      "receivedAt": "2026-10-24T10:43:00.550Z",
      "source": "live",
      "syncStatus": "synced",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "plate": "KJA-482-XY",
      "result": null,
      "violation": {
        "id": "VIO-30280",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": null,
      "report": null,
      "load": null,
      "sos": null,
      "evidenceCount": 2,
      "note": "Driver said the trip was paid at the last checkpoint."
    }
  ],
  "fieldReports": {
    "total": 1,
    "byType": [
      {
        "type": "vehicle",
        "count": 1
      },
      {
        "type": "driver",
        "count": 0
      }
    ],
    "items": [
      {
        "id": "fr-FR-5299",
        "kind": "field_report",
        "recordedAt": "2026-10-24T09:47:00.581Z",
        "receivedAt": "2026-10-24T09:47:45.581Z",
        "source": "live",
        "syncStatus": "synced",
        "agent": {
          "id": "JRB-AG-0145",
          "name": "Ada Nwosu"
        },
        "location": {
          "name": "Apapa Port Rd",
          "area": "Lagos",
          "code": "LOS-07"
        },
        "plate": "KJA-482-XY",
        "result": null,
        "violation": null,
        "payment": null,
        "report": {
          "type": "vehicle",
          "summary": "Trailer without a rear plate seen heading north."
        },
        "load": null,
        "sos": null,
        "evidenceCount": 2,
        "note": null
      }
    ]
  },
  "loadReports": {
    "loaded": 1,
    "empty": 0,
    "items": [
      {
        "id": "le-LE-8290",
        "kind": "load_status",
        "recordedAt": "2026-10-24T09:10:00.581Z",
        "receivedAt": "2026-10-24T09:10:45.581Z",
        "source": "live",
        "syncStatus": "synced",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "name": "Ojota enforcement point",
          "area": "Lagos",
          "code": "LOS-04"
        },
        "plate": "PHC-388-MN",
        "result": null,
        "violation": null,
        "payment": null,
        "report": null,
        "load": "loaded",
        "sos": null,
        "evidenceCount": 0,
        "note": null
      }
    ]
  },
  "sos": {
    "open": 2,
    "items": [
      {
        "id": "sos-SOS-428",
        "kind": "sos",
        "recordedAt": "2026-10-24T10:20:00.581Z",
        "receivedAt": "2026-10-24T10:20:20.581Z",
        "source": "live",
        "syncStatus": "synced",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "plate": null,
        "result": null,
        "violation": null,
        "payment": null,
        "report": null,
        "load": null,
        "sos": {
          "status": "open",
          "type": "threat_or_assault",
          "message": "Driver threatening agents at the checkpoint.",
          "closedAt": null
        },
        "evidenceCount": 0,
        "note": null
      },
      {
        "id": "sos-SOS-427",
        "kind": "sos",
        "recordedAt": "2026-10-24T08:50:00.581Z",
        "receivedAt": "2026-10-24T08:50:20.581Z",
        "source": "live",
        "syncStatus": "synced",
        "agent": {
          "id": "JRB-AG-0145",
          "name": "Ada Nwosu"
        },
        "location": {
          "name": "Apapa Port Rd",
          "area": "Lagos",
          "code": "LOS-07"
        },
        "plate": null,
        "result": null,
        "violation": null,
        "payment": null,
        "report": null,
        "load": null,
        "sos": {
          "status": "open",
          "type": "crowd_or_unrest",
          "message": "Crowd gathering around the enforcement team.",
          "closedAt": null
        },
        "evidenceCount": 0,
        "note": null
      }
    ]
  },
  "cases": {
    "unresolved": 17,
    "escalated": 5,
    "items": [
      {
        "id": "VIO-30280",
        "plate": "KJA-482-XY",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "area": "Lagos"
      },
      {
        "id": "VIO-30279",
        "plate": "PHC-338-MN",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "area": "Lagos"
      }
    ]
  },
  "repeatVehicles": {
    "open": 4,
    "withoutFollowUp": 2,
    "items": [
      {
        "plate": "KDN-512-ZA",
        "reports": 5,
        "agents": 1,
        "area": "Lagos",
        "followUp": "partial"
      },
      {
        "plate": "ENU-156-HL",
        "reports": 4,
        "agents": 2,
        "area": "Lagos",
        "followUp": "partial"
      }
    ]
  },
  "locations": [
    {
      "id": "loc_ojota",
      "name": "Ojota enforcement point",
      "area": "Lagos",
      "code": "LOS-04",
      "events": 2,
      "lastEventAt": "2026-10-24T09:10:00.581Z",
      "position": {
        "lat": 6.5866,
        "lng": 3.3792
      }
    },
    {
      "id": "loc_ikeja_gate",
      "name": "Ikeja Gate 3",
      "area": "Lagos",
      "code": "LOS-01",
      "events": 7,
      "lastEventAt": "2026-10-24T10:46:00.550Z",
      "position": {
        "lat": 6.6018,
        "lng": 3.3515
      }
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- A record made offline appears when it reaches CHL, with its earlier recorded time.

[↑ Back to the list](#endpoints)

---

### 9. Geographical monitoring

`GET /api/v1/geography`

Activity grouped by the geographic hierarchy (location, zone, ward, LGA, state, region, subregion, national) with the recorded GPS of each record.

- **Used by:** Geographical monitoring page (document 4)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name    | Required | Meaning                                                                                            |
| ------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope` | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range` | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`  | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`    | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |

#### Response

`200 OK`, JSON:

| Field                                        | Type                                                                        | Required | Can be null |
| -------------------------------------------- | --------------------------------------------------------------------------- | -------- | ----------- |
| `locations`                                  | array of objects                                                            | yes      | no          |
| `locations[].id`                             | string                                                                      | yes      | no          |
| `locations[].name`                           | string                                                                      | yes      | no          |
| `locations[].area`                           | string                                                                      | yes      | no          |
| `locations[].code`                           | string                                                                      | yes      | no          |
| `locations[].position`                       | object                                                                      | yes      | yes         |
| `locations[].position.lat`                   | number                                                                      | yes      | no          |
| `locations[].position.lng`                   | number                                                                      | yes      | no          |
| `locations[].verifications`                  | integer (0 or more)                                                         | yes      | no          |
| `locations[].violations`                     | integer (0 or more)                                                         | yes      | no          |
| `locations[].agents`                         | integer (0 or more)                                                         | yes      | no          |
| `locations[].lastRecordedAt`                 | string                                                                      | yes      | yes         |
| `records`                                    | object                                                                      | yes      | no          |
| `records.verifications`                      | array of objects                                                            | yes      | no          |
| `records.verifications[].id`                 | string                                                                      | yes      | no          |
| `records.verifications[].reference`          | string                                                                      | yes      | no          |
| `records.verifications[].plate`              | string                                                                      | yes      | no          |
| `records.verifications[].method`             | string (coded value) — see _Verification method_                            | yes      | yes         |
| `records.verifications[].result`             | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `records.verifications[].agent`              | object                                                                      | yes      | no          |
| `records.verifications[].agent.id`           | string                                                                      | yes      | no          |
| `records.verifications[].agent.name`         | string                                                                      | yes      | no          |
| `records.verifications[].location`           | object                                                                      | yes      | no          |
| `records.verifications[].location.id`        | string                                                                      | yes      | no          |
| `records.verifications[].location.name`      | string                                                                      | yes      | no          |
| `records.verifications[].location.area`      | string                                                                      | yes      | no          |
| `records.verifications[].location.code`      | string                                                                      | yes      | no          |
| `records.verifications[].position`           | object                                                                      | yes      | yes         |
| `records.verifications[].position.lat`       | number                                                                      | yes      | no          |
| `records.verifications[].position.lng`       | number                                                                      | yes      | no          |
| `records.verifications[].recordedAt`         | string                                                                      | yes      | no          |
| `records.verifications[].receivedAt`         | string                                                                      | yes      | yes         |
| `records.verifications[].source`             | string (coded value) — see _Record source_                                  | yes      | yes         |
| `records.verifications[].syncStatus`         | string (coded value) — see _Sync status_                                    | yes      | yes         |
| `records.violations`                         | array of objects                                                            | yes      | no          |
| `records.violations[].id`                    | string                                                                      | yes      | no          |
| `records.violations[].plate`                 | string                                                                      | yes      | no          |
| `records.violations[].category`              | string                                                                      | yes      | no          |
| `records.violations[].status`                | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `records.violations[].agent`                 | object                                                                      | yes      | no          |
| `records.violations[].agent.id`              | string                                                                      | yes      | no          |
| `records.violations[].agent.name`            | string                                                                      | yes      | no          |
| `records.violations[].location`              | object                                                                      | yes      | no          |
| `records.violations[].location.id`           | string                                                                      | yes      | no          |
| `records.violations[].location.name`         | string                                                                      | yes      | no          |
| `records.violations[].location.area`         | string                                                                      | yes      | no          |
| `records.violations[].location.code`         | string                                                                      | yes      | no          |
| `records.violations[].position`              | object                                                                      | yes      | yes         |
| `records.violations[].position.lat`          | number                                                                      | yes      | no          |
| `records.violations[].position.lng`          | number                                                                      | yes      | no          |
| `records.violations[].recordedAt`            | string                                                                      | yes      | no          |
| `records.violations[].noticeId`              | string                                                                      | yes      | yes         |
| `records.violations[].verificationReference` | string                                                                      | yes      | no          |
| `records.notices`                            | array of objects                                                            | yes      | no          |
| `records.notices[].id`                       | string                                                                      | yes      | no          |
| `records.notices[].violationId`              | string                                                                      | yes      | no          |
| `records.notices[].plate`                    | string                                                                      | yes      | no          |
| `records.notices[].status`                   | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `records.notices[].tripActivated`            | boolean                                                                     | yes      | no          |
| `records.notices[].location`                 | object                                                                      | yes      | no          |
| `records.notices[].location.id`              | string                                                                      | yes      | no          |
| `records.notices[].location.name`            | string                                                                      | yes      | no          |
| `records.notices[].location.area`            | string                                                                      | yes      | no          |
| `records.notices[].location.code`            | string                                                                      | yes      | no          |
| `records.notices[].recordedAt`               | string                                                                      | yes      | no          |
| `records.evidence`                           | array of objects                                                            | yes      | no          |
| `records.evidence[].id`                      | string                                                                      | yes      | no          |
| `records.evidence[].violationId`             | string                                                                      | yes      | no          |
| `records.evidence[].plate`                   | string                                                                      | yes      | no          |
| `records.evidence[].photographs`             | integer (0 or more)                                                         | yes      | no          |
| `records.evidence[].status`                  | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `records.evidence[].location`                | object                                                                      | yes      | no          |
| `records.evidence[].location.id`             | string                                                                      | yes      | no          |
| `records.evidence[].location.name`           | string                                                                      | yes      | no          |
| `records.evidence[].location.area`           | string                                                                      | yes      | no          |
| `records.evidence[].location.code`           | string                                                                      | yes      | no          |
| `records.evidence[].position`                | object                                                                      | yes      | yes         |
| `records.evidence[].position.lat`            | number                                                                      | yes      | no          |
| `records.evidence[].position.lng`            | number                                                                      | yes      | no          |
| `records.evidence[].recordedAt`              | string                                                                      | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "locations": [
    {
      "id": "loc_ojota",
      "name": "Ojota enforcement point",
      "area": "Lagos",
      "code": "LOS-04",
      "position": {
        "lat": 6.5866,
        "lng": 3.3792
      },
      "verifications": 3,
      "violations": 1,
      "agents": 1,
      "lastRecordedAt": "2026-10-20T13:41:38.527Z"
    },
    {
      "id": "loc_ikeja_gate",
      "name": "Ikeja Gate 3",
      "area": "Lagos",
      "code": "LOS-01",
      "position": {
        "lat": 6.6018,
        "lng": 3.3515
      },
      "verifications": 5,
      "violations": 5,
      "agents": 1,
      "lastRecordedAt": "2026-10-24T10:40:00.550Z"
    }
  ],
  "records": {
    "verifications": [
      {
        "id": "rec_151",
        "reference": "VR-24150",
        "plate": "KJA-482-XY",
        "method": "ocr",
        "result": "no_active_trip",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.5996,
          "lng": 3.34973
        },
        "recordedAt": "2026-10-24T10:40:00.550Z",
        "receivedAt": "2026-10-24T10:40:30.550Z",
        "source": "live",
        "syncStatus": "synced"
      },
      {
        "id": "rec_150",
        "reference": "VR-24149",
        "plate": "PHC-338-MN",
        "method": "rfid",
        "result": "no_active_trip",
        "agent": {
          "id": "JRB-AG-0145",
          "name": "Ada Nwosu"
        },
        "location": {
          "id": "loc_apapa",
          "name": "Apapa Port Rd",
          "area": "Lagos",
          "code": "LOS-07"
        },
        "position": {
          "lat": 6.44858,
          "lng": 3.36115
        },
        "recordedAt": "2026-10-24T10:20:00.550Z",
        "receivedAt": "2026-10-24T10:20:30.550Z",
        "source": "live",
        "syncStatus": "synced"
      }
    ],
    "violations": [
      {
        "id": "VIO-30280",
        "plate": "KJA-482-XY",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.5996,
          "lng": 3.34973
        },
        "recordedAt": "2026-10-24T10:40:00.550Z",
        "noticeId": "DN-30280",
        "verificationReference": "VR-24150"
      },
      {
        "id": "VIO-30279",
        "plate": "PHC-338-MN",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "agent": {
          "id": "JRB-AG-0145",
          "name": "Ada Nwosu"
        },
        "location": {
          "id": "loc_apapa",
          "name": "Apapa Port Rd",
          "area": "Lagos",
          "code": "LOS-07"
        },
        "position": {
          "lat": 6.44858,
          "lng": 3.36115
        },
        "recordedAt": "2026-10-24T10:20:00.550Z",
        "noticeId": "DN-30279",
        "verificationReference": "VR-24149"
      }
    ],
    "notices": [
      {
        "id": "DN-30280",
        "violationId": "VIO-30280",
        "plate": "KJA-482-XY",
        "status": "pending",
        "tripActivated": false,
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "recordedAt": "2026-10-24T10:40:00.550Z"
      },
      {
        "id": "DN-30279",
        "violationId": "VIO-30279",
        "plate": "PHC-338-MN",
        "status": "pending",
        "tripActivated": false,
        "location": {
          "id": "loc_apapa",
          "name": "Apapa Port Rd",
          "area": "Lagos",
          "code": "LOS-07"
        },
        "recordedAt": "2026-10-24T10:20:00.550Z"
      }
    ],
    "evidence": [
      {
        "id": "EV-30280",
        "violationId": "VIO-30280",
        "plate": "KJA-482-XY",
        "photographs": 2,
        "status": "received",
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.5996,
          "lng": 3.34973
        },
        "recordedAt": "2026-10-24T10:40:00.550Z"
      },
      {
        "id": "EV-30279",
        "violationId": "VIO-30279",
        "plate": "PHC-338-MN",
        "photographs": 5,
        "status": "received",
        "location": {
          "id": "loc_apapa",
          "name": "Apapa Port Rd",
          "area": "Lagos",
          "code": "LOS-07"
        },
        "position": {
          "lat": 6.44858,
          "lng": 3.36115
        },
        "recordedAt": "2026-10-24T10:20:00.550Z"
      }
    ]
  }
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Positions are where a record was made (WGS 84), never a live position.

[↑ Back to the list](#endpoints)

---

### 10. Agents & organizations

`GET /api/v1/agents/monitoring`

Each agent in the area with what they recorded in the period: verifications, results, violations, demand notices and follow-up.

- **Used by:** Agents & organizations page (document 5)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name    | Required | Meaning                                                                                            |
| ------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope` | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range` | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`  | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`    | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |

#### Response

`200 OK`, JSON:

| Field                                                | Type                                                                                           | Required | Can be null |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- | ----------- |
| `period`                                             | object                                                                                         | yes      | no          |
| `period.from`                                        | string (calendar day, YYYY-MM-DD)                                                              | yes      | no          |
| `period.to`                                          | string (calendar day, YYYY-MM-DD)                                                              | yes      | no          |
| `latestReceivedAt`                                   | string                                                                                         | yes      | yes         |
| `agents`                                             | array of objects                                                                               | yes      | no          |
| `agents[].id`                                        | string                                                                                         | yes      | no          |
| `agents[].name`                                      | string                                                                                         | yes      | no          |
| `agents[].organization`                              | string                                                                                         | yes      | yes         |
| `agents[].assignedScope`                             | array of objects                                                                               | yes      | yes         |
| `agents[].assignedScope[].level`                     | one of: `enforcement_point`, `zone`, `ward`, `lga`, `state`, `region`, `subregion`, `national` | yes      | no          |
| `agents[].assignedScope[].id`                        | string                                                                                         | yes      | no          |
| `agents[].assignedScope[].name`                      | string                                                                                         | yes      | no          |
| `agents[].lastRecordedAt`                            | string                                                                                         | yes      | yes         |
| `agents[].metrics`                                   | object                                                                                         | yes      | no          |
| `agents[].metrics.verifications`                     | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.outcomes`                          | array of objects                                                                               | yes      | no          |
| `agents[].metrics.outcomes[].outcome`                | string (coded value) — see _Verification outcome_                                              | yes      | no          |
| `agents[].metrics.outcomes[].count`                  | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.violationsIssued`                  | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.evidenceSubmitted`                 | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.demandNotices`                     | object                                                                                         | yes      | no          |
| `agents[].metrics.demandNotices.issued`              | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.demandNotices.paymentReceived`     | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.demandNotices.paymentPending`      | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.demandNotices.tripActivatedOnPaid` | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.unresolved`                        | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.escalated`                         | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.repeatAlerts`                      | integer (0 or more)                                                                            | yes      | no          |
| `agents[].metrics.enforcementLocations`              | integer (0 or more)                                                                            | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "period": {
    "from": "2026-10-11",
    "to": "2026-10-24"
  },
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "agents": [
    {
      "id": "JRB-AG-0142",
      "name": "Tunde Okafor",
      "organization": "Zone 1",
      "assignedScope": [
        {
          "level": "lga",
          "id": "la-ikeja",
          "name": "Ikeja"
        }
      ],
      "lastRecordedAt": "2026-10-24T10:40:00.550Z",
      "metrics": {
        "verifications": 8,
        "outcomes": [
          {
            "outcome": "active_trip",
            "count": 1
          },
          {
            "outcome": "vehicle_not_found",
            "count": 0
          }
        ],
        "violationsIssued": 6,
        "evidenceSubmitted": 6,
        "demandNotices": {
          "issued": 4,
          "paymentReceived": 0,
          "paymentPending": 4,
          "tripActivatedOnPaid": 0
        },
        "unresolved": 6,
        "escalated": 0,
        "repeatAlerts": 1,
        "enforcementLocations": 2
      }
    },
    {
      "id": "JRB-AG-0145",
      "name": "Ada Nwosu",
      "organization": "Zone 2",
      "assignedScope": null,
      "lastRecordedAt": "2026-10-24T10:20:00.550Z",
      "metrics": {
        "verifications": 4,
        "outcomes": [
          {
            "outcome": "active_trip",
            "count": 1
          },
          {
            "outcome": "vehicle_not_found",
            "count": 1
          }
        ],
        "violationsIssued": 2,
        "evidenceSubmitted": 2,
        "demandNotices": {
          "issued": 2,
          "paymentReceived": 0,
          "paymentPending": 2,
          "tripActivatedOnPaid": 0
        },
        "unresolved": 2,
        "escalated": 0,
        "repeatAlerts": 0,
        "enforcementLocations": 1
      }
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Monitoring only: counts of recorded activity, no scores, rankings, attendance or payroll.

[↑ Back to the list](#endpoints)

---

### 11. One agent's activity

`GET /api/v1/agents/{agentId}/activity`

One agent's identity, assigned scope, metrics, records, locations and follow-up in the area and period.

- **Used by:** An agent's page (/agents/{agentId})
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name             | Required | Meaning                                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `agentId (path)` | yes      | The agent ID, URL-encoded: `JRB-AG-0142`.                                                          |
| `scope`          | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`          | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`           | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`             | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |

#### Response

`200 OK`, JSON:

| Field                                             | Type                                                                                           | Required | Can be null |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- | ----------- |
| `agent`                                           | object                                                                                         | yes      | no          |
| `agent.id`                                        | string                                                                                         | yes      | no          |
| `agent.name`                                      | string                                                                                         | yes      | no          |
| `agent.organization`                              | string                                                                                         | yes      | yes         |
| `agent.assignedScope`                             | array of objects                                                                               | yes      | yes         |
| `agent.assignedScope[].level`                     | one of: `enforcement_point`, `zone`, `ward`, `lga`, `state`, `region`, `subregion`, `national` | yes      | no          |
| `agent.assignedScope[].id`                        | string                                                                                         | yes      | no          |
| `agent.assignedScope[].name`                      | string                                                                                         | yes      | no          |
| `agent.lastRecordedAt`                            | string                                                                                         | yes      | yes         |
| `agent.metrics`                                   | object                                                                                         | yes      | no          |
| `agent.metrics.verifications`                     | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.outcomes`                          | array of objects                                                                               | yes      | no          |
| `agent.metrics.outcomes[].outcome`                | string (coded value) — see _Verification outcome_                                              | yes      | no          |
| `agent.metrics.outcomes[].count`                  | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.violationsIssued`                  | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.evidenceSubmitted`                 | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.demandNotices`                     | object                                                                                         | yes      | no          |
| `agent.metrics.demandNotices.issued`              | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.demandNotices.paymentReceived`     | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.demandNotices.paymentPending`      | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.demandNotices.tripActivatedOnPaid` | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.unresolved`                        | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.escalated`                         | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.repeatAlerts`                      | integer (0 or more)                                                                            | yes      | no          |
| `agent.metrics.enforcementLocations`              | integer (0 or more)                                                                            | yes      | no          |
| `latestReceivedAt`                                | string                                                                                         | yes      | yes         |
| `records`                                         | object                                                                                         | yes      | no          |
| `records.verifications`                           | array of objects                                                                               | yes      | no          |
| `records.verifications[].id`                      | string                                                                                         | yes      | no          |
| `records.verifications[].reference`               | string                                                                                         | yes      | no          |
| `records.verifications[].plate`                   | string                                                                                         | yes      | no          |
| `records.verifications[].method`                  | string (coded value) — see _Verification method_                                               | yes      | yes         |
| `records.verifications[].result`                  | string (coded value) — see _Verification outcome_                                              | yes      | yes         |
| `records.verifications[].agent`                   | object                                                                                         | yes      | no          |
| `records.verifications[].agent.id`                | string                                                                                         | yes      | no          |
| `records.verifications[].agent.name`              | string                                                                                         | yes      | no          |
| `records.verifications[].location`                | object                                                                                         | yes      | no          |
| `records.verifications[].location.id`             | string                                                                                         | yes      | no          |
| `records.verifications[].location.name`           | string                                                                                         | yes      | no          |
| `records.verifications[].location.area`           | string                                                                                         | yes      | no          |
| `records.verifications[].location.code`           | string                                                                                         | yes      | no          |
| `records.verifications[].position`                | object                                                                                         | yes      | yes         |
| `records.verifications[].position.lat`            | number                                                                                         | yes      | no          |
| `records.verifications[].position.lng`            | number                                                                                         | yes      | no          |
| `records.verifications[].recordedAt`              | string                                                                                         | yes      | no          |
| `records.verifications[].receivedAt`              | string                                                                                         | yes      | yes         |
| `records.verifications[].source`                  | string (coded value) — see _Record source_                                                     | yes      | yes         |
| `records.verifications[].syncStatus`              | string (coded value) — see _Sync status_                                                       | yes      | yes         |
| `records.violations`                              | array of objects                                                                               | yes      | no          |
| `records.violations[].id`                         | string                                                                                         | yes      | no          |
| `records.violations[].plate`                      | string                                                                                         | yes      | no          |
| `records.violations[].category`                   | string                                                                                         | yes      | no          |
| `records.violations[].status`                     | string (coded value) — see _Case, payment, trip or SOS status (by context)_                    | yes      | no          |
| `records.violations[].agent`                      | object                                                                                         | yes      | no          |
| `records.violations[].agent.id`                   | string                                                                                         | yes      | no          |
| `records.violations[].agent.name`                 | string                                                                                         | yes      | no          |
| `records.violations[].location`                   | object                                                                                         | yes      | no          |
| `records.violations[].location.id`                | string                                                                                         | yes      | no          |
| `records.violations[].location.name`              | string                                                                                         | yes      | no          |
| `records.violations[].location.area`              | string                                                                                         | yes      | no          |
| `records.violations[].location.code`              | string                                                                                         | yes      | no          |
| `records.violations[].position`                   | object                                                                                         | yes      | yes         |
| `records.violations[].position.lat`               | number                                                                                         | yes      | no          |
| `records.violations[].position.lng`               | number                                                                                         | yes      | no          |
| `records.violations[].recordedAt`                 | string                                                                                         | yes      | no          |
| `records.violations[].noticeId`                   | string                                                                                         | yes      | yes         |
| `records.violations[].verificationReference`      | string                                                                                         | yes      | no          |
| `records.notices`                                 | array of objects                                                                               | yes      | no          |
| `records.notices[].id`                            | string                                                                                         | yes      | no          |
| `records.notices[].violationId`                   | string                                                                                         | yes      | no          |
| `records.notices[].plate`                         | string                                                                                         | yes      | no          |
| `records.notices[].status`                        | string (coded value) — see _Case, payment, trip or SOS status (by context)_                    | yes      | no          |
| `records.notices[].tripActivated`                 | boolean                                                                                        | yes      | no          |
| `records.notices[].location`                      | object                                                                                         | yes      | no          |
| `records.notices[].location.id`                   | string                                                                                         | yes      | no          |
| `records.notices[].location.name`                 | string                                                                                         | yes      | no          |
| `records.notices[].location.area`                 | string                                                                                         | yes      | no          |
| `records.notices[].location.code`                 | string                                                                                         | yes      | no          |
| `records.notices[].recordedAt`                    | string                                                                                         | yes      | no          |
| `records.evidence`                                | array of objects                                                                               | yes      | no          |
| `records.evidence[].id`                           | string                                                                                         | yes      | no          |
| `records.evidence[].violationId`                  | string                                                                                         | yes      | no          |
| `records.evidence[].plate`                        | string                                                                                         | yes      | no          |
| `records.evidence[].photographs`                  | integer (0 or more)                                                                            | yes      | no          |
| `records.evidence[].status`                       | string (coded value) — see _Case, payment, trip or SOS status (by context)_                    | yes      | no          |
| `records.evidence[].location`                     | object                                                                                         | yes      | no          |
| `records.evidence[].location.id`                  | string                                                                                         | yes      | no          |
| `records.evidence[].location.name`                | string                                                                                         | yes      | no          |
| `records.evidence[].location.area`                | string                                                                                         | yes      | no          |
| `records.evidence[].location.code`                | string                                                                                         | yes      | no          |
| `records.evidence[].position`                     | object                                                                                         | yes      | yes         |
| `records.evidence[].position.lat`                 | number                                                                                         | yes      | no          |
| `records.evidence[].position.lng`                 | number                                                                                         | yes      | no          |
| `records.evidence[].recordedAt`                   | string                                                                                         | yes      | no          |
| `locations`                                       | array of objects                                                                               | yes      | no          |
| `locations[].id`                                  | string                                                                                         | yes      | no          |
| `locations[].name`                                | string                                                                                         | yes      | no          |
| `locations[].area`                                | string                                                                                         | yes      | no          |
| `locations[].code`                                | string                                                                                         | yes      | no          |
| `locations[].position`                            | object                                                                                         | yes      | yes         |
| `locations[].position.lat`                        | number                                                                                         | yes      | no          |
| `locations[].position.lng`                        | number                                                                                         | yes      | no          |
| `locations[].verifications`                       | integer (0 or more)                                                                            | yes      | no          |
| `locations[].violations`                          | integer (0 or more)                                                                            | yes      | no          |
| `locations[].lastRecordedAt`                      | string                                                                                         | yes      | yes         |
| `cases`                                           | object                                                                                         | yes      | no          |
| `cases.unresolved`                                | integer (0 or more)                                                                            | yes      | no          |
| `cases.escalated`                                 | integer (0 or more)                                                                            | yes      | no          |
| `cases.items`                                     | array of objects                                                                               | yes      | no          |
| `cases.items[].id`                                | string                                                                                         | yes      | no          |
| `cases.items[].plate`                             | string                                                                                         | yes      | no          |
| `cases.items[].category`                          | string                                                                                         | yes      | no          |
| `cases.items[].status`                            | string (coded value) — see _Case, payment, trip or SOS status (by context)_                    | yes      | no          |
| `cases.items[].area`                              | string                                                                                         | yes      | no          |
| `repeatVehicles`                                  | object                                                                                         | yes      | no          |
| `repeatVehicles.open`                             | integer (0 or more)                                                                            | yes      | no          |
| `repeatVehicles.withoutFollowUp`                  | integer (0 or more)                                                                            | yes      | no          |
| `repeatVehicles.items`                            | array of objects                                                                               | yes      | no          |
| `repeatVehicles.items[].plate`                    | string                                                                                         | yes      | no          |
| `repeatVehicles.items[].reports`                  | integer (0 or more)                                                                            | yes      | no          |
| `repeatVehicles.items[].agents`                   | integer (0 or more)                                                                            | yes      | no          |
| `repeatVehicles.items[].area`                     | string                                                                                         | yes      | no          |
| `repeatVehicles.items[].followUp`                 | string (coded value) — see _Follow-up_                                                         | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "agent": {
    "id": "JRB-AG-0142",
    "name": "Tunde Okafor",
    "organization": "Zone 1",
    "assignedScope": [
      {
        "level": "lga",
        "id": "la-ikeja",
        "name": "Ikeja"
      }
    ],
    "lastRecordedAt": "2026-10-24T10:40:00.550Z",
    "metrics": {
      "verifications": 8,
      "outcomes": [
        {
          "outcome": "active_trip",
          "count": 1
        },
        {
          "outcome": "vehicle_not_found",
          "count": 0
        }
      ],
      "violationsIssued": 6,
      "evidenceSubmitted": 6,
      "demandNotices": {
        "issued": 4,
        "paymentReceived": 0,
        "paymentPending": 4,
        "tripActivatedOnPaid": 0
      },
      "unresolved": 6,
      "escalated": 0,
      "repeatAlerts": 1,
      "enforcementLocations": 2
    }
  },
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "records": {
    "verifications": [
      {
        "id": "rec_151",
        "reference": "VR-24150",
        "plate": "KJA-482-XY",
        "method": "ocr",
        "result": "no_active_trip",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.5996,
          "lng": 3.34973
        },
        "recordedAt": "2026-10-24T10:40:00.550Z",
        "receivedAt": "2026-10-24T10:40:30.550Z",
        "source": "live",
        "syncStatus": "synced"
      },
      {
        "id": "rec_147",
        "reference": "VR-24146",
        "plate": "KJA-482-XY",
        "method": "rfid",
        "result": "expired_trip",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.60238,
          "lng": 3.35228
        },
        "recordedAt": "2026-10-23T15:19:46.220Z",
        "receivedAt": "2026-10-23T15:20:16.220Z",
        "source": "live",
        "syncStatus": "synced"
      }
    ],
    "violations": [
      {
        "id": "VIO-30280",
        "plate": "KJA-482-XY",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.5996,
          "lng": 3.34973
        },
        "recordedAt": "2026-10-24T10:40:00.550Z",
        "noticeId": "DN-30280",
        "verificationReference": "VR-24150"
      },
      {
        "id": "VIO-30276",
        "plate": "KJA-482-XY",
        "category": "Expired Trip",
        "status": "awaiting_action",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.60238,
          "lng": 3.35228
        },
        "recordedAt": "2026-10-23T15:19:46.220Z",
        "noticeId": null,
        "verificationReference": "VR-24146"
      }
    ],
    "notices": [
      {
        "id": "DN-30280",
        "violationId": "VIO-30280",
        "plate": "KJA-482-XY",
        "status": "pending",
        "tripActivated": false,
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "recordedAt": "2026-10-24T10:40:00.550Z"
      },
      {
        "id": "DN-30273",
        "violationId": "VIO-30273",
        "plate": "KJA-482-XY",
        "status": "pending",
        "tripActivated": false,
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "recordedAt": "2026-10-21T06:17:36.572Z"
      }
    ],
    "evidence": [
      {
        "id": "EV-30280",
        "violationId": "VIO-30280",
        "plate": "KJA-482-XY",
        "photographs": 2,
        "status": "received",
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.5996,
          "lng": 3.34973
        },
        "recordedAt": "2026-10-24T10:40:00.550Z"
      },
      {
        "id": "EV-30276",
        "violationId": "VIO-30276",
        "plate": "KJA-482-XY",
        "photographs": 2,
        "status": "received",
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "position": {
          "lat": 6.60238,
          "lng": 3.35228
        },
        "recordedAt": "2026-10-23T15:19:46.220Z"
      }
    ]
  },
  "locations": [
    {
      "id": "loc_ojota",
      "name": "Ojota enforcement point",
      "area": "Lagos",
      "code": "LOS-04",
      "position": {
        "lat": 6.5866,
        "lng": 3.3792
      },
      "verifications": 3,
      "violations": 1,
      "lastRecordedAt": "2026-10-20T13:41:38.527Z"
    },
    {
      "id": "loc_ikeja_gate",
      "name": "Ikeja Gate 3",
      "area": "Lagos",
      "code": "LOS-01",
      "position": {
        "lat": 6.6018,
        "lng": 3.3515
      },
      "verifications": 5,
      "violations": 5,
      "lastRecordedAt": "2026-10-24T10:40:00.550Z"
    }
  ],
  "cases": {
    "unresolved": 6,
    "escalated": 0,
    "items": [
      {
        "id": "VIO-30280",
        "plate": "KJA-482-XY",
        "category": "No Active CHL Trip",
        "status": "payment_pending",
        "area": "Lagos"
      },
      {
        "id": "VIO-30276",
        "plate": "KJA-482-XY",
        "category": "Expired Trip",
        "status": "awaiting_action",
        "area": "Lagos"
      }
    ]
  },
  "repeatVehicles": {
    "open": 1,
    "withoutFollowUp": 1,
    "items": [
      {
        "plate": "KJA-482-XY",
        "reports": 3,
        "agents": 1,
        "area": "Lagos",
        "followUp": "none"
      }
    ]
  }
}
```

#### Errors

- `404` — the agent has no assignment or activity in that area, or the user may not see them there.
- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

[↑ Back to the list](#endpoints)

---

### 12. Verifications & E-Tags

`GET /api/v1/verifications/monitoring`

Every verification received by CHL in the area and period: method (RFID / QR / manual / OCR), outcome, E-Tag result, provenance, sync, the trip found, the action taken and the linked violation and payment request.

- **Used by:** Verifications & E-Tags page (document 6); Vehicle identity
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                          | Type                                                                        | Required | Can be null |
| ------------------------------ | --------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`             | string                                                                      | yes      | yes         |
| `records`                      | array of objects                                                            | yes      | no          |
| `records[].id`                 | string                                                                      | yes      | no          |
| `records[].reference`          | string                                                                      | yes      | no          |
| `records[].plate`              | string                                                                      | yes      | no          |
| `records[].method`             | string (coded value) — see _Verification method_                            | yes      | yes         |
| `records[].result`             | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `records[].agent`              | object                                                                      | yes      | no          |
| `records[].agent.id`           | string                                                                      | yes      | no          |
| `records[].agent.name`         | string                                                                      | yes      | no          |
| `records[].location`           | object                                                                      | yes      | no          |
| `records[].location.id`        | string                                                                      | yes      | no          |
| `records[].location.name`      | string                                                                      | yes      | no          |
| `records[].location.area`      | string                                                                      | yes      | no          |
| `records[].location.code`      | string                                                                      | yes      | no          |
| `records[].position`           | object                                                                      | yes      | yes         |
| `records[].position.lat`       | number                                                                      | yes      | no          |
| `records[].position.lng`       | number                                                                      | yes      | no          |
| `records[].recordedAt`         | string                                                                      | yes      | no          |
| `records[].receivedAt`         | string                                                                      | yes      | yes         |
| `records[].source`             | string (coded value) — see _Record source_                                  | yes      | yes         |
| `records[].syncStatus`         | string (coded value) — see _Sync status_                                    | yes      | yes         |
| `records[].etag`               | string (coded value) — see _E-Tag result_                                   | yes      | yes         |
| `records[].provenance`         | string (coded value) — see _Provenance_                                     | yes      | yes         |
| `records[].attempt`            | string (coded value) — see _Attempt status_                                 | yes      | yes         |
| `records[].vehicle`            | object                                                                      | yes      | no          |
| `records[].vehicle.id`         | string                                                                      | yes      | yes         |
| `records[].vehicle.type`       | string                                                                      | yes      | yes         |
| `records[].tripId`             | string                                                                      | yes      | yes         |
| `records[].actionTaken`        | string (coded value) — see _Action taken_                                   | yes      | yes         |
| `records[].violation`          | object                                                                      | yes      | yes         |
| `records[].violation.id`       | string                                                                      | yes      | no          |
| `records[].violation.category` | string                                                                      | yes      | no          |
| `records[].violation.status`   | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `records[].payment`            | object                                                                      | yes      | yes         |
| `records[].payment.id`         | string                                                                      | yes      | no          |
| `records[].payment.status`     | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "records": [
    {
      "id": "rec_151",
      "reference": "VR-24150",
      "plate": "KJA-482-XY",
      "method": "ocr",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "id": "loc_ikeja_gate",
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "position": {
        "lat": 6.5996,
        "lng": 3.34973
      },
      "recordedAt": "2026-10-24T10:40:00.550Z",
      "receivedAt": "2026-10-24T10:40:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": null,
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-85627",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30280",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30280",
        "status": "pending"
      }
    },
    {
      "id": "rec_150",
      "reference": "VR-24149",
      "plate": "PHC-338-MN",
      "method": "rfid",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "id": "loc_apapa",
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "position": {
        "lat": 6.44858,
        "lng": 3.36115
      },
      "recordedAt": "2026-10-24T10:20:00.550Z",
      "receivedAt": "2026-10-24T10:20:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": "valid",
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-92040",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30279",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30279",
        "status": "pending"
      }
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Never send the raw RFID tag value.
- A failed network call is not "No Active Trip": use `verification_unavailable`.

[↑ Back to the list](#endpoints)

---

### 13. CHL trip monitoring

`GET /api/v1/trips/monitoring`

CHL trips as CHL records them, the verifications that checked them, and destination detection. Read-only.

- **Used by:** Trip monitoring page (document 7)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name    | Required | Meaning                                                                                            |
| ------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope` | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range` | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`  | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`    | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |

#### Response

`200 OK`, JSON:

| Field                                     | Type                                                                        | Required | Can be null |
| ----------------------------------------- | --------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`                        | string                                                                      | yes      | yes         |
| `trips`                                   | array of objects                                                            | yes      | no          |
| `trips[].reference`                       | string                                                                      | yes      | no          |
| `trips[].transactionAt`                   | string                                                                      | yes      | yes         |
| `trips[].transactionStatus`               | string                                                                      | yes      | yes         |
| `trips[].terminalId`                      | string                                                                      | yes      | yes         |
| `trips[].contactNumber`                   | string                                                                      | yes      | yes         |
| `trips[].plate`                           | string                                                                      | yes      | no          |
| `trips[].vehicleType`                     | string                                                                      | yes      | yes         |
| `trips[].transactionType`                 | string                                                                      | yes      | yes         |
| `trips[].startedAt`                       | string                                                                      | yes      | yes         |
| `trips[].paidAt`                          | string                                                                      | yes      | yes         |
| `trips[].origin`                          | object                                                                      | yes      | yes         |
| `trips[].origin.state`                    | string                                                                      | yes      | no          |
| `trips[].origin.lga`                      | string                                                                      | yes      | yes         |
| `trips[].destination`                     | object                                                                      | yes      | yes         |
| `trips[].destination.state`               | string                                                                      | yes      | no          |
| `trips[].destination.lga`                 | string                                                                      | yes      | yes         |
| `trips[].status`                          | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `trips[].statusMessage`                   | string                                                                      | yes      | yes         |
| `trips[].channel`                         | string                                                                      | yes      | yes         |
| `trips[].channelType`                     | string                                                                      | yes      | yes         |
| `trips[].validity`                        | object                                                                      | yes      | yes         |
| `trips[].validity.remainingSeconds`       | integer (0 or more)                                                         | yes      | no          |
| `trips[].validity.reportedAt`             | string                                                                      | yes      | no          |
| `trips[].destinationDetection`            | object                                                                      | yes      | yes         |
| `trips[].destinationDetection.status`     | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `trips[].destinationDetection.reportedAt` | string                                                                      | yes      | no          |
| `vehicles`                                | array of objects                                                            | yes      | no          |
| `vehicles[].plate`                        | string                                                                      | yes      | no          |
| `vehicles[].vehicleType`                  | string                                                                      | yes      | yes         |
| `vehicles[].result`                       | string (coded value) — see _Verification outcome_                           | yes      | no          |
| `vehicles[].verification`                 | object                                                                      | yes      | no          |
| `vehicles[].verification.reference`       | string                                                                      | yes      | no          |
| `vehicles[].verification.outcome`         | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `vehicles[].verification.recordedAt`      | string                                                                      | yes      | no          |
| `vehicles[].verification.agent`           | object                                                                      | yes      | no          |
| `vehicles[].verification.agent.id`        | string                                                                      | yes      | no          |
| `vehicles[].verification.agent.name`      | string                                                                      | yes      | no          |
| `vehicles[].verification.location`        | object                                                                      | yes      | no          |
| `vehicles[].verification.location.id`     | string                                                                      | yes      | no          |
| `vehicles[].verification.location.name`   | string                                                                      | yes      | no          |
| `vehicles[].verification.location.area`   | string                                                                      | yes      | no          |
| `vehicles[].verification.location.code`   | string                                                                      | yes      | no          |
| `vehicles[].activeTripReference`          | string                                                                      | yes      | yes         |
| `vehicles[].previousTripReference`        | string                                                                      | yes      | yes         |
| `postPayment`                             | array of objects                                                            | yes      | no          |
| `postPayment[].noticeId`                  | string                                                                      | yes      | no          |
| `postPayment[].violationId`               | string                                                                      | yes      | no          |
| `postPayment[].plate`                     | string                                                                      | yes      | no          |
| `postPayment[].paidAt`                    | string                                                                      | yes      | no          |
| `postPayment[].tripActivated`             | boolean                                                                     | yes      | no          |
| `postPayment[].tripReference`             | string                                                                      | yes      | yes         |
| `postPayment[].complianceStatus`          | string                                                                      | yes      | yes         |
| `postPayment[].updatedAt`                 | string                                                                      | yes      | yes         |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "trips": [
    {
      "reference": "564032084903",
      "transactionAt": "2026-10-21T01:43:27.425Z",
      "transactionStatus": "Successful",
      "terminalId": "2761QLTJ",
      "contactNumber": "8102932608",
      "plate": "KJA-482-XY",
      "vehicleType": "12/14 tyres and its equivalent",
      "transactionType": "Complete Leg",
      "startedAt": "2026-10-21T02:30:30.926Z",
      "paidAt": "2026-10-21T01:43:27.425Z",
      "origin": {
        "state": "FCT",
        "lga": "AMAC"
      },
      "destination": {
        "state": "Rivers",
        "lga": "Eleme"
      },
      "status": "active",
      "statusMessage": null,
      "channel": "Fortis",
      "channelType": "POS",
      "validity": {
        "remainingSeconds": 50627,
        "reportedAt": "2026-10-21T12:26:43.021Z"
      },
      "destinationDetection": {
        "status": "destination_detected",
        "reportedAt": "2026-10-21T09:34:33.918Z"
      }
    },
    {
      "reference": "564032076984",
      "transactionAt": "2026-10-19T06:51:48.040Z",
      "transactionStatus": "Successful",
      "terminalId": "7106YASA",
      "contactNumber": "8151813321",
      "plate": "KJA-482-XY",
      "vehicleType": "12/14 tyres and its equivalent",
      "transactionType": "Complete Leg",
      "startedAt": "2026-10-19T07:40:04.271Z",
      "paidAt": "2026-10-19T06:51:48.040Z",
      "origin": {
        "state": "Lagos",
        "lga": "Apapa"
      },
      "destination": {
        "state": "Rivers",
        "lga": "Eleme"
      },
      "status": "closed",
      "statusMessage": null,
      "channel": "Fortis",
      "channelType": "POS",
      "validity": {
        "remainingSeconds": 0,
        "reportedAt": "2026-10-21T06:17:36.572Z"
      },
      "destinationDetection": {
        "status": "trip_completed",
        "reportedAt": "2026-10-19T12:26:03.493Z"
      }
    }
  ],
  "vehicles": [
    {
      "plate": "KJA-482-XY",
      "vehicleType": "12/14 tyres and its equivalent",
      "result": "no_active_trip",
      "verification": {
        "reference": "VR-24150",
        "outcome": "no_active_trip",
        "recordedAt": "2026-10-24T10:40:00.550Z",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "id": "loc_ikeja_gate",
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        }
      },
      "activeTripReference": null,
      "previousTripReference": null
    },
    {
      "plate": "PHC-338-MN",
      "vehicleType": "12/14 tyres and its equivalent",
      "result": "no_active_trip",
      "verification": {
        "reference": "VR-24149",
        "outcome": "no_active_trip",
        "recordedAt": "2026-10-24T10:20:00.550Z",
        "agent": {
          "id": "JRB-AG-0145",
          "name": "Ada Nwosu"
        },
        "location": {
          "id": "loc_apapa",
          "name": "Apapa Port Rd",
          "area": "Lagos",
          "code": "LOS-07"
        }
      },
      "activeTripReference": null,
      "previousTripReference": null
    }
  ],
  "postPayment": []
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- The dashboard never computes trip validity: send CHL's own status and result.

[↑ Back to the list](#endpoints)

---

### 14. Cases needing attention (count)

`GET /api/v1/violations/summary`

How many unresolved or escalated cases need attention in the user's areas.

- **Used by:** Sidebar dot on Violations & cases (every page, refreshed each minute)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Response

`200 OK`, JSON:

| Field              | Type                | Required | Can be null |
| ------------------ | ------------------- | -------- | ----------- |
| `needingAttention` | integer (0 or more) | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "needingAttention": 3
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

[↑ Back to the list](#endpoints)

---

### 15. Violations & cases

`GET /api/v1/violations/monitoring`

The violations received by CHL in the area and period as case records: category, status, evidence, demand notice, payment, agent and location. Read-only.

- **Used by:** Violations & cases page (document 8)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                            | Type                                                                        | Required | Can be null |
| -------------------------------- | --------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`               | string                                                                      | yes      | yes         |
| `cases`                          | array of objects                                                            | yes      | no          |
| `cases[].id`                     | string                                                                      | yes      | no          |
| `cases[].category`               | string                                                                      | yes      | no          |
| `cases[].status`                 | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `cases[].recordedAt`             | string                                                                      | yes      | no          |
| `cases[].receivedAt`             | string                                                                      | yes      | yes         |
| `cases[].plate`                  | string                                                                      | yes      | no          |
| `cases[].vehicleId`              | string                                                                      | yes      | yes         |
| `cases[].vehicleType`            | string                                                                      | yes      | yes         |
| `cases[].agent`                  | object                                                                      | yes      | no          |
| `cases[].agent.id`               | string                                                                      | yes      | no          |
| `cases[].agent.name`             | string                                                                      | yes      | no          |
| `cases[].location`               | object                                                                      | yes      | no          |
| `cases[].location.id`            | string                                                                      | yes      | no          |
| `cases[].location.name`          | string                                                                      | yes      | no          |
| `cases[].location.area`          | string                                                                      | yes      | no          |
| `cases[].location.code`          | string                                                                      | yes      | no          |
| `cases[].position`               | object                                                                      | yes      | yes         |
| `cases[].position.lat`           | number                                                                      | yes      | no          |
| `cases[].position.lng`           | number                                                                      | yes      | no          |
| `cases[].verification`           | object                                                                      | yes      | no          |
| `cases[].verification.reference` | string                                                                      | yes      | no          |
| `cases[].verification.outcome`   | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `cases[].evidence`               | object                                                                      | yes      | yes         |
| `cases[].evidence.id`            | string                                                                      | yes      | no          |
| `cases[].evidence.photographs`   | integer (0 or more)                                                         | yes      | no          |
| `cases[].evidence.status`        | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `cases[].notes`                  | array of objects                                                            | yes      | no          |
| `cases[].notes[].id`             | string                                                                      | yes      | no          |
| `cases[].notes[].text`           | string                                                                      | yes      | no          |
| `cases[].notes[].submittedAt`    | string                                                                      | yes      | no          |
| `cases[].notes[].agent`          | object                                                                      | yes      | no          |
| `cases[].notes[].agent.id`       | string                                                                      | yes      | no          |
| `cases[].notes[].agent.name`     | string                                                                      | yes      | no          |
| `cases[].notice`                 | object                                                                      | yes      | yes         |
| `cases[].notice.id`              | string                                                                      | yes      | no          |
| `cases[].notice.status`          | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `cases[].notice.paidAt`          | string                                                                      | yes      | yes         |
| `cases[].actions`                | array of objects                                                            | yes      | no          |
| `cases[].actions[].action`       | string                                                                      | yes      | no          |
| `cases[].actions[].at`           | string                                                                      | yes      | no          |
| `cases[].actions[].actor`        | object                                                                      | yes      | yes         |
| `cases[].actions[].actor.id`     | string                                                                      | yes      | no          |
| `cases[].actions[].actor.name`   | string                                                                      | yes      | no          |
| `cases[].actions[].actor.role`   | string                                                                      | yes      | no          |
| `cases[].closure`                | object                                                                      | yes      | yes         |
| `cases[].closure.outcome`        | string (coded value) — see _Verification outcome_                           | yes      | no          |
| `cases[].closure.at`             | string                                                                      | yes      | no          |
| `cases[].closure.actor`          | object                                                                      | yes      | yes         |
| `cases[].closure.actor.id`       | string                                                                      | yes      | no          |
| `cases[].closure.actor.name`     | string                                                                      | yes      | no          |
| `cases[].closure.actor.role`     | string                                                                      | yes      | no          |
| `cases[].closure.reason`         | string                                                                      | yes      | yes         |
| `cases[].closure.auditReference` | string                                                                      | yes      | yes         |
| `cases[].repeatAlert`            | object                                                                      | yes      | yes         |
| `cases[].repeatAlert.reports`    | integer (0 or more)                                                         | yes      | no          |
| `cases[].repeatAlert.followUp`   | string (coded value) — see _Follow-up_                                      | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "cases": [
    {
      "id": "VIO-30280",
      "category": "No Active CHL Trip",
      "status": "payment_pending",
      "recordedAt": "2026-10-24T10:40:00.550Z",
      "receivedAt": "2026-10-24T10:40:30.550Z",
      "plate": "KJA-482-XY",
      "vehicleId": "VH-85627",
      "vehicleType": "12/14 tyres and its equivalent",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "id": "loc_ikeja_gate",
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "position": {
        "lat": 6.5996,
        "lng": 3.34973
      },
      "verification": {
        "reference": "VR-24150",
        "outcome": "no_active_trip"
      },
      "evidence": {
        "id": "EV-30280",
        "photographs": 2,
        "status": "received"
      },
      "notes": [
        {
          "id": "NT-30280",
          "text": "Driver could not show an active trip for this movement. Vehicle stopped at the checkpoint and the driver informed.",
          "submittedAt": "2026-10-24T10:42:00.550Z",
          "agent": {
            "id": "JRB-AG-0142",
            "name": "Tunde Okafor"
          }
        }
      ],
      "notice": {
        "id": "DN-30280",
        "status": "pending",
        "paidAt": null
      },
      "actions": [
        {
          "action": "violation_issued",
          "at": "2026-10-24T10:40:00.550Z",
          "actor": {
            "id": "JRB-AG-0142",
            "name": "Tunde Okafor",
            "role": "Enforcement agent"
          }
        },
        {
          "action": "demand_notice_issued",
          "at": "2026-10-24T10:45:00.550Z",
          "actor": null
        }
      ],
      "closure": null,
      "repeatAlert": {
        "reports": 3,
        "followUp": "none"
      }
    },
    {
      "id": "VIO-30279",
      "category": "No Active CHL Trip",
      "status": "payment_pending",
      "recordedAt": "2026-10-24T10:20:00.550Z",
      "receivedAt": "2026-10-24T10:20:30.550Z",
      "plate": "PHC-338-MN",
      "vehicleId": "VH-92040",
      "vehicleType": "12/14 tyres and its equivalent",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "id": "loc_apapa",
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "position": {
        "lat": 6.44858,
        "lng": 3.36115
      },
      "verification": {
        "reference": "VR-24149",
        "outcome": "no_active_trip"
      },
      "evidence": {
        "id": "EV-30279",
        "photographs": 5,
        "status": "received"
      },
      "notes": [
        {
          "id": "NT-30279",
          "text": "Driver could not show an active trip for this movement. Vehicle stopped at the checkpoint and the driver informed.",
          "submittedAt": "2026-10-24T10:24:00.550Z",
          "agent": {
            "id": "JRB-AG-0145",
            "name": "Ada Nwosu"
          }
        }
      ],
      "notice": {
        "id": "DN-30279",
        "status": "pending",
        "paidAt": null
      },
      "actions": [
        {
          "action": "violation_issued",
          "at": "2026-10-24T10:20:00.550Z",
          "actor": {
            "id": "JRB-AG-0145",
            "name": "Ada Nwosu",
            "role": "Enforcement agent"
          }
        },
        {
          "action": "demand_notice_issued",
          "at": "2026-10-24T10:25:00.550Z",
          "actor": null
        }
      ],
      "closure": null,
      "repeatAlert": null
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Statuses are CHL's: Payment Pending, Resolved, Escalated, Cancelled. The dashboard never closes or cancels a case.

[↑ Back to the list](#endpoints)

---

### 16. Evidence records

`GET /api/v1/evidence/monitoring`

Evidence photographs and notes linked to verifications and violations, with upload status. Read-only: nothing is ever uploaded or edited.

- **Used by:** Evidence records page (document 9)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                                  | Type                                                                               | Required | Can be null |
| -------------------------------------- | ---------------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`                     | string                                                                             | yes      | yes         |
| `records`                              | array of objects                                                                   | yes      | no          |
| `records[].id`                         | string                                                                             | yes      | no          |
| `records[].status`                     | string (coded value) — see _Case, payment, trip or SOS status (by context)_        | yes      | no          |
| `records[].violation`                  | object                                                                             | yes      | no          |
| `records[].violation.id`               | string                                                                             | yes      | no          |
| `records[].violation.category`         | string                                                                             | yes      | no          |
| `records[].violation.status`           | string (coded value) — see _Case, payment, trip or SOS status (by context)_        | yes      | no          |
| `records[].verificationReference`      | string                                                                             | yes      | no          |
| `records[].plate`                      | string                                                                             | yes      | no          |
| `records[].vehicleId`                  | string                                                                             | yes      | yes         |
| `records[].agent`                      | object                                                                             | yes      | no          |
| `records[].agent.id`                   | string                                                                             | yes      | no          |
| `records[].agent.name`                 | string                                                                             | yes      | no          |
| `records[].location`                   | object                                                                             | yes      | no          |
| `records[].location.id`                | string                                                                             | yes      | no          |
| `records[].location.name`              | string                                                                             | yes      | no          |
| `records[].location.area`              | string                                                                             | yes      | no          |
| `records[].location.code`              | string                                                                             | yes      | no          |
| `records[].photographs`                | array of objects                                                                   | yes      | no          |
| `records[].photographs[].id`           | string                                                                             | yes      | no          |
| `records[].photographs[].kind`         | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_ | yes      | no          |
| `records[].photographs[].url`          | string                                                                             | yes      | yes         |
| `records[].photographs[].capturedAt`   | string                                                                             | yes      | no          |
| `records[].photographs[].position`     | object                                                                             | yes      | yes         |
| `records[].photographs[].position.lat` | number                                                                             | yes      | no          |
| `records[].photographs[].position.lng` | number                                                                             | yes      | no          |
| `records[].notes`                      | array of objects                                                                   | yes      | no          |
| `records[].notes[].id`                 | string                                                                             | yes      | no          |
| `records[].notes[].text`               | string                                                                             | yes      | no          |
| `records[].notes[].submittedAt`        | string                                                                             | yes      | no          |
| `records[].notes[].agent`              | object                                                                             | yes      | no          |
| `records[].notes[].agent.id`           | string                                                                             | yes      | no          |
| `records[].notes[].agent.name`         | string                                                                             | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "records": [
    {
      "id": "EV-30280",
      "status": "received",
      "violation": {
        "id": "VIO-30280",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "verificationReference": "VR-24150",
      "plate": "KJA-482-XY",
      "vehicleId": "VH-85627",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "id": "loc_ikeja_gate",
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "photographs": [
        {
          "id": "PH-30280-1",
          "kind": "front",
          "url": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2326453a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230f2a20%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%0A%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22url(%23g)%22%2F%3E%0A%3Cg%20fill%3D%22none%22%20stroke%3D%22%239fc4b1%22%20stroke-width%3D%2210%22%20stroke-linejoin%3D%22round%22%20opacity%3D%220.8%22%3E%0A%3Crect%20x%3D%22500%22%20y%3D%22290%22%20width%3D%22200%22%20height%3D%22140%22%20rx%3D%2220%22%2F%3E%3Ccircle%20cx%3D%22600%22%20cy%3D%22360%22%20r%3D%2240%22%2F%3E%3Cpath%20d%3D%22M555%20290l18-30h54l18%2030%22%2F%3E%0A%3C%2Fg%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22520%22%20fill%3D%22%23e3f0e8%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2244%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%3EFront%20of%20vehicle%3C%2Ftext%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22580%22%20fill%3D%22%239fc4b1%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%3EKJA-482-XY%20%C2%B7%20Sample%20photograph%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
          "capturedAt": "2026-10-24T10:40:40.550Z",
          "position": {
            "lat": 6.5996,
            "lng": 3.34973
          }
        },
        {
          "id": "PH-30280-2",
          "kind": "rear",
          "url": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2326453a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230f2a20%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%0A%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22url(%23g)%22%2F%3E%0A%3Cg%20fill%3D%22none%22%20stroke%3D%22%239fc4b1%22%20stroke-width%3D%2210%22%20stroke-linejoin%3D%22round%22%20opacity%3D%220.8%22%3E%0A%3Crect%20x%3D%22500%22%20y%3D%22290%22%20width%3D%22200%22%20height%3D%22140%22%20rx%3D%2220%22%2F%3E%3Ccircle%20cx%3D%22600%22%20cy%3D%22360%22%20r%3D%2240%22%2F%3E%3Cpath%20d%3D%22M555%20290l18-30h54l18%2030%22%2F%3E%0A%3C%2Fg%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22520%22%20fill%3D%22%23e3f0e8%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2244%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%3ERear%20of%20vehicle%3C%2Ftext%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22580%22%20fill%3D%22%239fc4b1%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%3EKJA-482-XY%20%C2%B7%20Sample%20photograph%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
          "capturedAt": "2026-10-24T10:41:20.550Z",
          "position": {
            "lat": 6.5996,
            "lng": 3.34973
          }
        }
      ],
      "notes": [
        {
          "id": "NT-30280",
          "text": "Driver could not show an active trip for this movement. Vehicle stopped at the checkpoint and the driver informed.",
          "submittedAt": "2026-10-24T10:42:00.550Z",
          "agent": {
            "id": "JRB-AG-0142",
            "name": "Tunde Okafor"
          }
        }
      ]
    },
    {
      "id": "EV-30279",
      "status": "received",
      "violation": {
        "id": "VIO-30279",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "verificationReference": "VR-24149",
      "plate": "PHC-338-MN",
      "vehicleId": "VH-92040",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "id": "loc_apapa",
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "photographs": [
        {
          "id": "PH-30279-1",
          "kind": "front",
          "url": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2326453a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230f2a20%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%0A%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22url(%23g)%22%2F%3E%0A%3Cg%20fill%3D%22none%22%20stroke%3D%22%239fc4b1%22%20stroke-width%3D%2210%22%20stroke-linejoin%3D%22round%22%20opacity%3D%220.8%22%3E%0A%3Crect%20x%3D%22500%22%20y%3D%22290%22%20width%3D%22200%22%20height%3D%22140%22%20rx%3D%2220%22%2F%3E%3Ccircle%20cx%3D%22600%22%20cy%3D%22360%22%20r%3D%2240%22%2F%3E%3Cpath%20d%3D%22M555%20290l18-30h54l18%2030%22%2F%3E%0A%3C%2Fg%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22520%22%20fill%3D%22%23e3f0e8%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2244%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%3EFront%20of%20vehicle%3C%2Ftext%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22580%22%20fill%3D%22%239fc4b1%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%3EPHC-338-MN%20%C2%B7%20Sample%20photograph%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
          "capturedAt": "2026-10-24T10:20:40.550Z",
          "position": {
            "lat": 6.44858,
            "lng": 3.36115
          }
        },
        {
          "id": "PH-30279-2",
          "kind": "rear",
          "url": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2326453a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230f2a20%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%0A%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22url(%23g)%22%2F%3E%0A%3Cg%20fill%3D%22none%22%20stroke%3D%22%239fc4b1%22%20stroke-width%3D%2210%22%20stroke-linejoin%3D%22round%22%20opacity%3D%220.8%22%3E%0A%3Crect%20x%3D%22500%22%20y%3D%22290%22%20width%3D%22200%22%20height%3D%22140%22%20rx%3D%2220%22%2F%3E%3Ccircle%20cx%3D%22600%22%20cy%3D%22360%22%20r%3D%2240%22%2F%3E%3Cpath%20d%3D%22M555%20290l18-30h54l18%2030%22%2F%3E%0A%3C%2Fg%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22520%22%20fill%3D%22%23e3f0e8%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2244%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%3ERear%20of%20vehicle%3C%2Ftext%3E%0A%3Ctext%20x%3D%22600%22%20y%3D%22580%22%20fill%3D%22%239fc4b1%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%3EPHC-338-MN%20%C2%B7%20Sample%20photograph%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
          "capturedAt": "2026-10-24T10:21:20.550Z",
          "position": {
            "lat": 6.44858,
            "lng": 3.36115
          }
        }
      ],
      "notes": [
        {
          "id": "NT-30279",
          "text": "Driver could not show an active trip for this movement. Vehicle stopped at the checkpoint and the driver informed.",
          "submittedAt": "2026-10-24T10:24:00.550Z",
          "agent": {
            "id": "JRB-AG-0145",
            "name": "Ada Nwosu"
          }
        }
      ]
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- An image `url` is null while it is still uploading from the device. Image URLs should be short-lived or need the access token.

[↑ Back to the list](#endpoints)

---

### 17. Field reports

`GET /api/v1/field-reports`

Vehicle, driver, situation and general reports, and loaded / empty confirmations, sent by agents in the area and period.

- **Used by:** Field reports page
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                                 | Type                                                                                       | Required | Can be null |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | -------- | ----------- |
| `latestReceivedAt`                    | string                                                                                     | yes      | yes         |
| `reports`                             | array of objects                                                                           | yes      | no          |
| `reports[].id`                        | string                                                                                     | yes      | no          |
| `reports[].kind`                      | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `reports[].recordedAt`                | string                                                                                     | yes      | no          |
| `reports[].receivedAt`                | string                                                                                     | yes      | yes         |
| `reports[].source`                    | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `reports[].syncStatus`                | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `reports[].agent`                     | object                                                                                     | yes      | no          |
| `reports[].agent.id`                  | string                                                                                     | yes      | no          |
| `reports[].agent.name`                | string                                                                                     | yes      | no          |
| `reports[].location`                  | object                                                                                     | yes      | no          |
| `reports[].location.name`             | string                                                                                     | yes      | no          |
| `reports[].location.area`             | string                                                                                     | yes      | no          |
| `reports[].location.code`             | string                                                                                     | yes      | no          |
| `reports[].plate`                     | string                                                                                     | yes      | yes         |
| `reports[].result`                    | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `reports[].violation`                 | object                                                                                     | yes      | yes         |
| `reports[].violation.id`              | string                                                                                     | yes      | no          |
| `reports[].violation.category`        | string                                                                                     | yes      | no          |
| `reports[].violation.status`          | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `reports[].payment`                   | object                                                                                     | yes      | yes         |
| `reports[].payment.noticeId`          | string                                                                                     | yes      | no          |
| `reports[].payment.status`            | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `reports[].payment.tripActivated`     | boolean                                                                                    | yes      | no          |
| `reports[].report`                    | object                                                                                     | yes      | yes         |
| `reports[].report.type`               | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `reports[].report.summary`            | string                                                                                     | yes      | no          |
| `reports[].load`                      | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `reports[].sos`                       | object                                                                                     | yes      | yes         |
| `reports[].sos.status`                | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `reports[].sos.type`                  | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `reports[].sos.message`               | string                                                                                     | yes      | yes         |
| `reports[].sos.closedAt`              | string                                                                                     | yes      | yes         |
| `reports[].evidenceCount`             | integer (0 or more)                                                                        | yes      | no          |
| `reports[].note`                      | string                                                                                     | yes      | yes         |
| `loadReports`                         | array of objects                                                                           | yes      | no          |
| `loadReports[].id`                    | string                                                                                     | yes      | no          |
| `loadReports[].kind`                  | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `loadReports[].recordedAt`            | string                                                                                     | yes      | no          |
| `loadReports[].receivedAt`            | string                                                                                     | yes      | yes         |
| `loadReports[].source`                | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `loadReports[].syncStatus`            | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `loadReports[].agent`                 | object                                                                                     | yes      | no          |
| `loadReports[].agent.id`              | string                                                                                     | yes      | no          |
| `loadReports[].agent.name`            | string                                                                                     | yes      | no          |
| `loadReports[].location`              | object                                                                                     | yes      | no          |
| `loadReports[].location.name`         | string                                                                                     | yes      | no          |
| `loadReports[].location.area`         | string                                                                                     | yes      | no          |
| `loadReports[].location.code`         | string                                                                                     | yes      | no          |
| `loadReports[].plate`                 | string                                                                                     | yes      | yes         |
| `loadReports[].result`                | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `loadReports[].violation`             | object                                                                                     | yes      | yes         |
| `loadReports[].violation.id`          | string                                                                                     | yes      | no          |
| `loadReports[].violation.category`    | string                                                                                     | yes      | no          |
| `loadReports[].violation.status`      | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `loadReports[].payment`               | object                                                                                     | yes      | yes         |
| `loadReports[].payment.noticeId`      | string                                                                                     | yes      | no          |
| `loadReports[].payment.status`        | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `loadReports[].payment.tripActivated` | boolean                                                                                    | yes      | no          |
| `loadReports[].report`                | object                                                                                     | yes      | yes         |
| `loadReports[].report.type`           | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `loadReports[].report.summary`        | string                                                                                     | yes      | no          |
| `loadReports[].load`                  | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `loadReports[].sos`                   | object                                                                                     | yes      | yes         |
| `loadReports[].sos.status`            | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `loadReports[].sos.type`              | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `loadReports[].sos.message`           | string                                                                                     | yes      | yes         |
| `loadReports[].sos.closedAt`          | string                                                                                     | yes      | yes         |
| `loadReports[].evidenceCount`         | integer (0 or more)                                                                        | yes      | no          |
| `loadReports[].note`                  | string                                                                                     | yes      | yes         |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T09:47:45.581Z",
  "reports": [
    {
      "id": "fr-FR-5299",
      "kind": "field_report",
      "recordedAt": "2026-10-24T09:47:00.581Z",
      "receivedAt": "2026-10-24T09:47:45.581Z",
      "source": "live",
      "syncStatus": "synced",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "plate": "KJA-482-XY",
      "result": null,
      "violation": null,
      "payment": null,
      "report": {
        "type": "vehicle",
        "summary": "Trailer without a rear plate seen heading north."
      },
      "load": null,
      "sos": null,
      "evidenceCount": 2,
      "note": null
    },
    {
      "id": "fr-FR-5293",
      "kind": "field_report",
      "recordedAt": "2026-10-16T10:23:46.770Z",
      "receivedAt": "2026-10-16T10:24:31.770Z",
      "source": "live",
      "syncStatus": "synced",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "name": "Ojota enforcement point",
        "area": "Lagos",
        "code": "LOS-04"
      },
      "plate": "PHC-338-MN",
      "result": null,
      "violation": null,
      "payment": null,
      "report": {
        "type": "vehicle",
        "summary": "Trailer without a rear plate seen heading north."
      },
      "load": null,
      "sos": null,
      "evidenceCount": 2,
      "note": null
    }
  ],
  "loadReports": [
    {
      "id": "le-LE-8290",
      "kind": "load_status",
      "recordedAt": "2026-10-24T09:10:00.581Z",
      "receivedAt": "2026-10-24T09:10:45.581Z",
      "source": "live",
      "syncStatus": "synced",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "name": "Ojota enforcement point",
        "area": "Lagos",
        "code": "LOS-04"
      },
      "plate": "PHC-388-MN",
      "result": null,
      "violation": null,
      "payment": null,
      "report": null,
      "load": "loaded",
      "sos": null,
      "evidenceCount": 0,
      "note": null
    },
    {
      "id": "le-LE-8286",
      "kind": "load_status",
      "recordedAt": "2026-10-22T13:14:55.207Z",
      "receivedAt": "2026-10-22T14:52:30.810Z",
      "source": "offline",
      "syncStatus": "synced",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "plate": "KJA-482-XY",
      "result": null,
      "violation": null,
      "payment": null,
      "report": null,
      "load": "empty",
      "sos": null,
      "evidenceCount": 0,
      "note": null
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

[↑ Back to the list](#endpoints)

---

### 18. Demand notices & payments

`GET /api/v1/payments/monitoring`

Demand notices, their payment status and payment transactions in the area and period.

- **Used by:** Payments & compliance page (document 10)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                                | Type                                                                                       | Required | Can be null |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | -------- | ----------- |
| `latestReceivedAt`                   | string                                                                                     | yes      | yes         |
| `notices`                            | array of objects                                                                           | yes      | no          |
| `notices[].id`                       | string                                                                                     | yes      | no          |
| `notices[].issuedAt`                 | string                                                                                     | yes      | no          |
| `notices[].violation`                | object                                                                                     | yes      | no          |
| `notices[].violation.id`             | string                                                                                     | yes      | no          |
| `notices[].violation.category`       | string                                                                                     | yes      | no          |
| `notices[].violation.status`         | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `notices[].plate`                    | string                                                                                     | yes      | no          |
| `notices[].vehicleId`                | string                                                                                     | yes      | yes         |
| `notices[].vehicleType`              | string                                                                                     | yes      | yes         |
| `notices[].agent`                    | object                                                                                     | yes      | no          |
| `notices[].agent.id`                 | string                                                                                     | yes      | no          |
| `notices[].agent.name`               | string                                                                                     | yes      | no          |
| `notices[].location`                 | object                                                                                     | yes      | no          |
| `notices[].location.id`              | string                                                                                     | yes      | no          |
| `notices[].location.name`            | string                                                                                     | yes      | no          |
| `notices[].location.area`            | string                                                                                     | yes      | no          |
| `notices[].location.code`            | string                                                                                     | yes      | no          |
| `notices[].verificationReference`    | string                                                                                     | yes      | no          |
| `notices[].amounts`                  | object                                                                                     | yes      | no          |
| `notices[].amounts.levy`             | number                                                                                     | yes      | yes         |
| `notices[].amounts.penalty`          | number                                                                                     | yes      | yes         |
| `notices[].amounts.total`            | number                                                                                     | yes      | yes         |
| `notices[].paymentReference`         | string                                                                                     | yes      | yes         |
| `notices[].method`                   | object                                                                                     | yes      | yes         |
| `notices[].method.type`              | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `notices[].method.detail`            | string                                                                                     | yes      | yes         |
| `notices[].status`                   | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `notices[].paidAt`                   | string                                                                                     | yes      | yes         |
| `notices[].compliance`               | object                                                                                     | yes      | yes         |
| `notices[].compliance.tripActivated` | boolean                                                                                    | yes      | no          |
| `notices[].compliance.tripReference` | string                                                                                     | yes      | yes         |
| `notices[].compliance.tagging`       | string (coded value) — see _Tagging_                                                       | yes      | yes         |
| `notices[].compliance.outcome`       | string                                                                                     | yes      | yes         |
| `notices[].compliance.updatedAt`     | string                                                                                     | yes      | yes         |
| `notices[].transactions`             | array of objects                                                                           | yes      | no          |
| `notices[].transactions[].reference` | string                                                                                     | yes      | no          |
| `notices[].transactions[].kind`      | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `notices[].transactions[].at`        | string                                                                                     | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "notices": [
    {
      "id": "DN-30280",
      "issuedAt": "2026-10-24T10:45:00.550Z",
      "violation": {
        "id": "VIO-30280",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "plate": "KJA-482-XY",
      "vehicleId": "VH-85627",
      "vehicleType": "12/14 tyres and its equivalent",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "id": "loc_ikeja_gate",
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "verificationReference": "VR-24150",
      "amounts": {
        "levy": 20000,
        "penalty": 50000,
        "total": 70000
      },
      "paymentReference": "JRB-PAY-30280",
      "method": {
        "type": "chl_platform",
        "detail": null
      },
      "status": "pending",
      "paidAt": null,
      "compliance": null,
      "transactions": []
    },
    {
      "id": "DN-30279",
      "issuedAt": "2026-10-24T10:25:00.550Z",
      "violation": {
        "id": "VIO-30279",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "plate": "PHC-338-MN",
      "vehicleId": "VH-92040",
      "vehicleType": "12/14 tyres and its equivalent",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "id": "loc_apapa",
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "verificationReference": "VR-24149",
      "amounts": {
        "levy": 20000,
        "penalty": 50000,
        "total": 70000
      },
      "paymentReference": "JRB-PAY-30279",
      "method": {
        "type": "chl_platform",
        "detail": null
      },
      "status": "pending",
      "paidAt": null,
      "compliance": null,
      "transactions": []
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- A payment received does not mean a trip was activated: send both as CHL records them.
- The dashboard never confirms a payment.

[↑ Back to the list](#endpoints)

---

### 19. Unread notifications (top bar)

`GET /api/v1/notifications/summary`

How many notifications this user has not read, and the latest few for the bell's menu.

- **Used by:** The bell in the top bar (every page, refreshed each minute)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Response

`200 OK`, JSON:

| Field                                  | Type                                                                                       | Required | Can be null |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | -------- | ----------- |
| `unread`                               | integer (0 or more)                                                                        | yes      | no          |
| `latest`                               | array of objects                                                                           | yes      | no          |
| `latest[].id`                          | string                                                                                     | yes      | no          |
| `latest[].category`                    | string (coded value) — see _Notification category or violation category (by context)_      | yes      | no          |
| `latest[].type`                        | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `latest[].title`                       | string                                                                                     | yes      | no          |
| `latest[].receivedAt`                  | string                                                                                     | yes      | no          |
| `latest[].read`                        | boolean                                                                                    | yes      | no          |
| `latest[].plate`                       | string                                                                                     | yes      | yes         |
| `latest[].agent`                       | object                                                                                     | yes      | yes         |
| `latest[].agent.id`                    | string                                                                                     | yes      | no          |
| `latest[].agent.name`                  | string                                                                                     | yes      | no          |
| `latest[].location`                    | object                                                                                     | yes      | yes         |
| `latest[].location.name`               | string                                                                                     | yes      | no          |
| `latest[].location.area`               | string                                                                                     | yes      | no          |
| `latest[].location.code`               | string                                                                                     | yes      | no          |
| `latest[].entry`                       | object                                                                                     | yes      | yes         |
| `latest[].entry.id`                    | string                                                                                     | yes      | no          |
| `latest[].entry.kind`                  | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `latest[].entry.recordedAt`            | string                                                                                     | yes      | no          |
| `latest[].entry.receivedAt`            | string                                                                                     | yes      | yes         |
| `latest[].entry.source`                | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `latest[].entry.syncStatus`            | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `latest[].entry.agent`                 | object                                                                                     | yes      | no          |
| `latest[].entry.agent.id`              | string                                                                                     | yes      | no          |
| `latest[].entry.agent.name`            | string                                                                                     | yes      | no          |
| `latest[].entry.location`              | object                                                                                     | yes      | no          |
| `latest[].entry.location.name`         | string                                                                                     | yes      | no          |
| `latest[].entry.location.area`         | string                                                                                     | yes      | no          |
| `latest[].entry.location.code`         | string                                                                                     | yes      | no          |
| `latest[].entry.plate`                 | string                                                                                     | yes      | yes         |
| `latest[].entry.result`                | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `latest[].entry.violation`             | object                                                                                     | yes      | yes         |
| `latest[].entry.violation.id`          | string                                                                                     | yes      | no          |
| `latest[].entry.violation.category`    | string                                                                                     | yes      | no          |
| `latest[].entry.violation.status`      | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `latest[].entry.payment`               | object                                                                                     | yes      | yes         |
| `latest[].entry.payment.noticeId`      | string                                                                                     | yes      | no          |
| `latest[].entry.payment.status`        | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `latest[].entry.payment.tripActivated` | boolean                                                                                    | yes      | no          |
| `latest[].entry.report`                | object                                                                                     | yes      | yes         |
| `latest[].entry.report.type`           | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `latest[].entry.report.summary`        | string                                                                                     | yes      | no          |
| `latest[].entry.load`                  | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `latest[].entry.sos`                   | object                                                                                     | yes      | yes         |
| `latest[].entry.sos.status`            | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `latest[].entry.sos.type`              | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `latest[].entry.sos.message`           | string                                                                                     | yes      | yes         |
| `latest[].entry.sos.closedAt`          | string                                                                                     | yes      | yes         |
| `latest[].entry.evidenceCount`         | integer (0 or more)                                                                        | yes      | no          |
| `latest[].entry.note`                  | string                                                                                     | yes      | yes         |
| `latest[].repeatVehicle`               | object                                                                                     | yes      | yes         |
| `latest[].repeatVehicle.plate`         | string                                                                                     | yes      | no          |
| `latest[].repeatVehicle.reports`       | integer (0 or more)                                                                        | yes      | no          |
| `latest[].repeatVehicle.agents`        | integer (0 or more)                                                                        | yes      | no          |
| `latest[].repeatVehicle.area`          | string                                                                                     | yes      | no          |
| `latest[].repeatVehicle.followUp`      | string (coded value) — see _Follow-up_                                                     | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "unread": 0,
  "latest": []
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- `latest` should hold the six latest.

[↑ Back to the list](#endpoints)

---

### 20. Notifications

`GET /api/v1/notifications`

The enforcement, field and operational notifications CHL delivered in the area and period, with this user's read state.

- **Used by:** Notifications page (document 11)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                                         | Type                                                                                       | Required | Can be null |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- | ----------- |
| `latestReceivedAt`                            | string                                                                                     | yes      | yes         |
| `notifications`                               | array of objects                                                                           | yes      | no          |
| `notifications[].id`                          | string                                                                                     | yes      | no          |
| `notifications[].category`                    | string (coded value) — see _Notification category or violation category (by context)_      | yes      | no          |
| `notifications[].type`                        | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `notifications[].title`                       | string                                                                                     | yes      | no          |
| `notifications[].receivedAt`                  | string                                                                                     | yes      | no          |
| `notifications[].read`                        | boolean                                                                                    | yes      | no          |
| `notifications[].plate`                       | string                                                                                     | yes      | yes         |
| `notifications[].agent`                       | object                                                                                     | yes      | yes         |
| `notifications[].agent.id`                    | string                                                                                     | yes      | no          |
| `notifications[].agent.name`                  | string                                                                                     | yes      | no          |
| `notifications[].location`                    | object                                                                                     | yes      | yes         |
| `notifications[].location.name`               | string                                                                                     | yes      | no          |
| `notifications[].location.area`               | string                                                                                     | yes      | no          |
| `notifications[].location.code`               | string                                                                                     | yes      | no          |
| `notifications[].entry`                       | object                                                                                     | yes      | yes         |
| `notifications[].entry.id`                    | string                                                                                     | yes      | no          |
| `notifications[].entry.kind`                  | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_         | yes      | no          |
| `notifications[].entry.recordedAt`            | string                                                                                     | yes      | no          |
| `notifications[].entry.receivedAt`            | string                                                                                     | yes      | yes         |
| `notifications[].entry.source`                | string (coded value) — see _Record source_                                                 | yes      | yes         |
| `notifications[].entry.syncStatus`            | string (coded value) — see _Sync status_                                                   | yes      | yes         |
| `notifications[].entry.agent`                 | object                                                                                     | yes      | no          |
| `notifications[].entry.agent.id`              | string                                                                                     | yes      | no          |
| `notifications[].entry.agent.name`            | string                                                                                     | yes      | no          |
| `notifications[].entry.location`              | object                                                                                     | yes      | no          |
| `notifications[].entry.location.name`         | string                                                                                     | yes      | no          |
| `notifications[].entry.location.area`         | string                                                                                     | yes      | no          |
| `notifications[].entry.location.code`         | string                                                                                     | yes      | no          |
| `notifications[].entry.plate`                 | string                                                                                     | yes      | yes         |
| `notifications[].entry.result`                | string (coded value) — see _Verification outcome_                                          | yes      | yes         |
| `notifications[].entry.violation`             | object                                                                                     | yes      | yes         |
| `notifications[].entry.violation.id`          | string                                                                                     | yes      | no          |
| `notifications[].entry.violation.category`    | string                                                                                     | yes      | no          |
| `notifications[].entry.violation.status`      | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `notifications[].entry.payment`               | object                                                                                     | yes      | yes         |
| `notifications[].entry.payment.noticeId`      | string                                                                                     | yes      | no          |
| `notifications[].entry.payment.status`        | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `notifications[].entry.payment.tripActivated` | boolean                                                                                    | yes      | no          |
| `notifications[].entry.report`                | object                                                                                     | yes      | yes         |
| `notifications[].entry.report.type`           | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | no          |
| `notifications[].entry.report.summary`        | string                                                                                     | yes      | no          |
| `notifications[].entry.load`                  | string (coded value) — see _Load status_                                                   | yes      | yes         |
| `notifications[].entry.sos`                   | object                                                                                     | yes      | yes         |
| `notifications[].entry.sos.status`            | string (coded value) — see _Case, payment, trip or SOS status (by context)_                | yes      | no          |
| `notifications[].entry.sos.type`              | string (coded value) — see _Notification type / field report type / SOS type (by context)_ | yes      | yes         |
| `notifications[].entry.sos.message`           | string                                                                                     | yes      | yes         |
| `notifications[].entry.sos.closedAt`          | string                                                                                     | yes      | yes         |
| `notifications[].entry.evidenceCount`         | integer (0 or more)                                                                        | yes      | no          |
| `notifications[].entry.note`                  | string                                                                                     | yes      | yes         |
| `notifications[].repeatVehicle`               | object                                                                                     | yes      | yes         |
| `notifications[].repeatVehicle.plate`         | string                                                                                     | yes      | no          |
| `notifications[].repeatVehicle.reports`       | integer (0 or more)                                                                        | yes      | no          |
| `notifications[].repeatVehicle.agents`        | integer (0 or more)                                                                        | yes      | no          |
| `notifications[].repeatVehicle.area`          | string                                                                                     | yes      | no          |
| `notifications[].repeatVehicle.followUp`      | string (coded value) — see _Follow-up_                                                     | yes      | no          |
| `operationalProvided`                         | boolean                                                                                    | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:20:30.550Z",
  "notifications": [
    {
      "id": "ntf-repeat-PHC-338-MN",
      "category": "enforcement",
      "type": "repeat_vehicle",
      "title": "Repeat vehicle PHC-338-MN",
      "receivedAt": "2026-10-24T10:20:30.550Z",
      "read": false,
      "plate": "PHC-338-MN",
      "agent": null,
      "location": {
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "entry": null,
      "repeatVehicle": {
        "plate": "PHC-338-MN",
        "reports": 3,
        "agents": 2,
        "area": "Lagos",
        "followUp": "none"
      }
    },
    {
      "id": "ntf-sos-SOS-428",
      "category": "field",
      "type": "sos",
      "title": "SOS from Tunde Okafor",
      "receivedAt": "2026-10-24T10:20:20.581Z",
      "read": false,
      "plate": null,
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "entry": {
        "id": "sos-SOS-428",
        "kind": "sos",
        "recordedAt": "2026-10-24T10:20:00.581Z",
        "receivedAt": "2026-10-24T10:20:20.581Z",
        "source": "live",
        "syncStatus": "synced",
        "agent": {
          "id": "JRB-AG-0142",
          "name": "Tunde Okafor"
        },
        "location": {
          "name": "Ikeja Gate 3",
          "area": "Lagos",
          "code": "LOS-01"
        },
        "plate": null,
        "result": null,
        "violation": null,
        "payment": null,
        "report": null,
        "load": null,
        "sos": {
          "status": "open",
          "type": "threat_or_assault",
          "message": "Driver threatening agents at the checkpoint.",
          "closedAt": null
        },
        "evidenceCount": 0,
        "note": null
      },
      "repeatVehicle": null
    }
  ],
  "operationalProvided": false
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- `operationalProvided` says whether CHL passes on agents' operational notifications (reader, internet, GPS, sync) at all.

[↑ Back to the list](#endpoints)

---

### 21. Mark notifications as read

`POST /api/v1/notifications/read`

Marks notifications as read for this user only. It changes no CHL business record.

- **Used by:** Notifications page and the bell
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Request body (JSON)

| Field | Type            | Required | Can be null |
| ----- | --------------- | -------- | ----------- |
| `ids` | array of string | yes      | no          |

Example:

```json
{
  "ids": ["ntf-1024", "ntf-1023"]
}
```

#### Response

`204 No Content`.

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

[↑ Back to the list](#endpoints)

---

### 22. Repeat vehicle alerts

`GET /api/v1/repeat-alerts`

Vehicles reported three qualifying times without appropriate follow-up, their reports, agents, locations, cases and the supervisory notifications.

- **Used by:** Repeat vehicle alerts page (document 11)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                                     | Type                                                                        | Required | Can be null |
| ----------------------------------------- | --------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`                        | string                                                                      | yes      | yes         |
| `threshold`                               | integer (0 or more)                                                         | yes      | no          |
| `alerts`                                  | array of objects                                                            | yes      | no          |
| `alerts[].plate`                          | string                                                                      | yes      | no          |
| `alerts[].vehicleId`                      | string                                                                      | yes      | yes         |
| `alerts[].vehicleType`                    | string                                                                      | yes      | yes         |
| `alerts[].area`                           | string                                                                      | yes      | no          |
| `alerts[].reports`                        | integer (0 or more)                                                         | yes      | no          |
| `alerts[].followUp`                       | string (coded value) — see _Follow-up_                                      | yes      | no          |
| `alerts[].firstReportedAt`                | string                                                                      | yes      | no          |
| `alerts[].lastReportedAt`                 | string                                                                      | yes      | no          |
| `alerts[].raisedAt`                       | string                                                                      | yes      | no          |
| `alerts[].cases`                          | array of objects                                                            | yes      | no          |
| `alerts[].cases[].id`                     | string                                                                      | yes      | no          |
| `alerts[].cases[].category`               | string                                                                      | yes      | no          |
| `alerts[].cases[].status`                 | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `alerts[].cases[].recordedAt`             | string                                                                      | yes      | no          |
| `alerts[].cases[].receivedAt`             | string                                                                      | yes      | yes         |
| `alerts[].cases[].plate`                  | string                                                                      | yes      | no          |
| `alerts[].cases[].vehicleId`              | string                                                                      | yes      | yes         |
| `alerts[].cases[].vehicleType`            | string                                                                      | yes      | yes         |
| `alerts[].cases[].agent`                  | object                                                                      | yes      | no          |
| `alerts[].cases[].agent.id`               | string                                                                      | yes      | no          |
| `alerts[].cases[].agent.name`             | string                                                                      | yes      | no          |
| `alerts[].cases[].location`               | object                                                                      | yes      | no          |
| `alerts[].cases[].location.id`            | string                                                                      | yes      | no          |
| `alerts[].cases[].location.name`          | string                                                                      | yes      | no          |
| `alerts[].cases[].location.area`          | string                                                                      | yes      | no          |
| `alerts[].cases[].location.code`          | string                                                                      | yes      | no          |
| `alerts[].cases[].position`               | object                                                                      | yes      | yes         |
| `alerts[].cases[].position.lat`           | number                                                                      | yes      | no          |
| `alerts[].cases[].position.lng`           | number                                                                      | yes      | no          |
| `alerts[].cases[].verification`           | object                                                                      | yes      | no          |
| `alerts[].cases[].verification.reference` | string                                                                      | yes      | no          |
| `alerts[].cases[].verification.outcome`   | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `alerts[].cases[].evidence`               | object                                                                      | yes      | yes         |
| `alerts[].cases[].evidence.id`            | string                                                                      | yes      | no          |
| `alerts[].cases[].evidence.photographs`   | integer (0 or more)                                                         | yes      | no          |
| `alerts[].cases[].evidence.status`        | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `alerts[].cases[].notes`                  | array of objects                                                            | yes      | no          |
| `alerts[].cases[].notes[].id`             | string                                                                      | yes      | no          |
| `alerts[].cases[].notes[].text`           | string                                                                      | yes      | no          |
| `alerts[].cases[].notes[].submittedAt`    | string                                                                      | yes      | no          |
| `alerts[].cases[].notes[].agent`          | object                                                                      | yes      | no          |
| `alerts[].cases[].notes[].agent.id`       | string                                                                      | yes      | no          |
| `alerts[].cases[].notes[].agent.name`     | string                                                                      | yes      | no          |
| `alerts[].cases[].notice`                 | object                                                                      | yes      | yes         |
| `alerts[].cases[].notice.id`              | string                                                                      | yes      | no          |
| `alerts[].cases[].notice.status`          | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `alerts[].cases[].notice.paidAt`          | string                                                                      | yes      | yes         |
| `alerts[].cases[].actions`                | array of objects                                                            | yes      | no          |
| `alerts[].cases[].actions[].action`       | string                                                                      | yes      | no          |
| `alerts[].cases[].actions[].at`           | string                                                                      | yes      | no          |
| `alerts[].cases[].actions[].actor`        | object                                                                      | yes      | yes         |
| `alerts[].cases[].actions[].actor.id`     | string                                                                      | yes      | no          |
| `alerts[].cases[].actions[].actor.name`   | string                                                                      | yes      | no          |
| `alerts[].cases[].actions[].actor.role`   | string                                                                      | yes      | no          |
| `alerts[].cases[].closure`                | object                                                                      | yes      | yes         |
| `alerts[].cases[].closure.outcome`        | string (coded value) — see _Verification outcome_                           | yes      | no          |
| `alerts[].cases[].closure.at`             | string                                                                      | yes      | no          |
| `alerts[].cases[].closure.actor`          | object                                                                      | yes      | yes         |
| `alerts[].cases[].closure.actor.id`       | string                                                                      | yes      | no          |
| `alerts[].cases[].closure.actor.name`     | string                                                                      | yes      | no          |
| `alerts[].cases[].closure.actor.role`     | string                                                                      | yes      | no          |
| `alerts[].cases[].closure.reason`         | string                                                                      | yes      | yes         |
| `alerts[].cases[].closure.auditReference` | string                                                                      | yes      | yes         |
| `alerts[].cases[].repeatAlert`            | object                                                                      | yes      | yes         |
| `alerts[].cases[].repeatAlert.reports`    | integer (0 or more)                                                         | yes      | no          |
| `alerts[].cases[].repeatAlert.followUp`   | string (coded value) — see _Follow-up_                                      | yes      | no          |
| `alerts[].notification`                   | object                                                                      | yes      | yes         |
| `alerts[].notification.id`                | string                                                                      | yes      | no          |
| `alerts[].notification.receivedAt`        | string                                                                      | yes      | no          |
| `alerts[].notification.read`              | boolean                                                                     | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "threshold": 3,
  "alerts": [
    {
      "plate": "KJA-482-XY",
      "vehicleId": "VH-85627",
      "vehicleType": "12/14 tyres and its equivalent",
      "area": "Lagos",
      "reports": 3,
      "followUp": "none",
      "firstReportedAt": "2026-10-21T06:17:36.572Z",
      "lastReportedAt": "2026-10-24T10:40:00.550Z",
      "raisedAt": "2026-10-23T15:19:46.220Z",
      "cases": [
        {
          "id": "VIO-30273",
          "category": "Expired Trip",
          "status": "payment_pending",
          "recordedAt": "2026-10-21T06:17:36.572Z",
          "receivedAt": "2026-10-21T06:18:06.572Z",
          "plate": "KJA-482-XY",
          "vehicleId": "VH-85627",
          "vehicleType": "12/14 tyres and its equivalent",
          "agent": {
            "id": "JRB-AG-0142",
            "name": "Tunde Okafor"
          },
          "location": {
            "id": "loc_ikeja_gate",
            "name": "Ikeja Gate 3",
            "area": "Lagos",
            "code": "LOS-01"
          },
          "position": {
            "lat": 6.60332,
            "lng": 3.35241
          },
          "verification": {
            "reference": "VR-24135",
            "outcome": "expired_trip"
          },
          "evidence": {
            "id": "EV-30273",
            "photographs": 3,
            "status": "received"
          },
          "notes": [
            {
              "id": "NT-30273",
              "text": "Driver presented a trip that had already expired.",
              "submittedAt": "2026-10-21T06:20:16.572Z",
              "agent": {
                "id": "JRB-AG-0142",
                "name": "Tunde Okafor"
              }
            }
          ],
          "notice": {
            "id": "DN-30273",
            "status": "pending",
            "paidAt": null
          },
          "actions": [
            {
              "action": "violation_issued",
              "at": "2026-10-21T06:17:36.572Z",
              "actor": {
                "id": "JRB-AG-0142",
                "name": "Tunde Okafor",
                "role": "Enforcement agent"
              }
            },
            {
              "action": "demand_notice_issued",
              "at": "2026-10-21T06:22:36.572Z",
              "actor": null
            }
          ],
          "closure": null,
          "repeatAlert": {
            "reports": 3,
            "followUp": "none"
          }
        },
        {
          "id": "VIO-30276",
          "category": "Expired Trip",
          "status": "awaiting_action",
          "recordedAt": "2026-10-23T15:19:46.220Z",
          "receivedAt": "2026-10-23T15:20:16.220Z",
          "plate": "KJA-482-XY",
          "vehicleId": "VH-85627",
          "vehicleType": "12/14 tyres and its equivalent",
          "agent": {
            "id": "JRB-AG-0142",
            "name": "Tunde Okafor"
          },
          "location": {
            "id": "loc_ikeja_gate",
            "name": "Ikeja Gate 3",
            "area": "Lagos",
            "code": "LOS-01"
          },
          "position": {
            "lat": 6.60238,
            "lng": 3.35228
          },
          "verification": {
            "reference": "VR-24146",
            "outcome": "expired_trip"
          },
          "evidence": {
            "id": "EV-30276",
            "photographs": 2,
            "status": "received"
          },
          "notes": [
            {
              "id": "NT-30276",
              "text": "Driver presented a trip that had already expired.",
              "submittedAt": "2026-10-23T15:21:46.220Z",
              "agent": {
                "id": "JRB-AG-0142",
                "name": "Tunde Okafor"
              }
            }
          ],
          "notice": null,
          "actions": [
            {
              "action": "violation_issued",
              "at": "2026-10-23T15:19:46.220Z",
              "actor": {
                "id": "JRB-AG-0142",
                "name": "Tunde Okafor",
                "role": "Enforcement agent"
              }
            }
          ],
          "closure": null,
          "repeatAlert": {
            "reports": 3,
            "followUp": "none"
          }
        }
      ],
      "notification": {
        "id": "ntf-repeat-KJA-482-XY",
        "receivedAt": "2026-10-23T15:20:16.220Z",
        "read": false
      }
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Three _qualifying_ reports without follow-up — not any three scans.

[↑ Back to the list](#endpoints)

---

### 23. Verification history

`GET /api/v1/verification-history`

The recorded verification attempts with completion status, action taken, linked violation, payment request generated and pending actions.

- **Used by:** Verification history page (document 12.1)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                          | Type                                                                        | Required | Can be null |
| ------------------------------ | --------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`             | string                                                                      | yes      | yes         |
| `records`                      | array of objects                                                            | yes      | no          |
| `records[].id`                 | string                                                                      | yes      | no          |
| `records[].reference`          | string                                                                      | yes      | no          |
| `records[].plate`              | string                                                                      | yes      | no          |
| `records[].method`             | string (coded value) — see _Verification method_                            | yes      | yes         |
| `records[].result`             | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `records[].agent`              | object                                                                      | yes      | no          |
| `records[].agent.id`           | string                                                                      | yes      | no          |
| `records[].agent.name`         | string                                                                      | yes      | no          |
| `records[].location`           | object                                                                      | yes      | no          |
| `records[].location.id`        | string                                                                      | yes      | no          |
| `records[].location.name`      | string                                                                      | yes      | no          |
| `records[].location.area`      | string                                                                      | yes      | no          |
| `records[].location.code`      | string                                                                      | yes      | no          |
| `records[].position`           | object                                                                      | yes      | yes         |
| `records[].position.lat`       | number                                                                      | yes      | no          |
| `records[].position.lng`       | number                                                                      | yes      | no          |
| `records[].recordedAt`         | string                                                                      | yes      | no          |
| `records[].receivedAt`         | string                                                                      | yes      | yes         |
| `records[].source`             | string (coded value) — see _Record source_                                  | yes      | yes         |
| `records[].syncStatus`         | string (coded value) — see _Sync status_                                    | yes      | yes         |
| `records[].etag`               | string (coded value) — see _E-Tag result_                                   | yes      | yes         |
| `records[].provenance`         | string (coded value) — see _Provenance_                                     | yes      | yes         |
| `records[].attempt`            | string (coded value) — see _Attempt status_                                 | yes      | yes         |
| `records[].vehicle`            | object                                                                      | yes      | no          |
| `records[].vehicle.id`         | string                                                                      | yes      | yes         |
| `records[].vehicle.type`       | string                                                                      | yes      | yes         |
| `records[].tripId`             | string                                                                      | yes      | yes         |
| `records[].actionTaken`        | string (coded value) — see _Action taken_                                   | yes      | yes         |
| `records[].violation`          | object                                                                      | yes      | yes         |
| `records[].violation.id`       | string                                                                      | yes      | no          |
| `records[].violation.category` | string                                                                      | yes      | no          |
| `records[].violation.status`   | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `records[].payment`            | object                                                                      | yes      | yes         |
| `records[].payment.id`         | string                                                                      | yes      | no          |
| `records[].payment.status`     | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "records": [
    {
      "id": "rec_151",
      "reference": "VR-24150",
      "plate": "KJA-482-XY",
      "method": "ocr",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "id": "loc_ikeja_gate",
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "position": {
        "lat": 6.5996,
        "lng": 3.34973
      },
      "recordedAt": "2026-10-24T10:40:00.550Z",
      "receivedAt": "2026-10-24T10:40:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": null,
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-85627",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30280",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30280",
        "status": "pending"
      }
    },
    {
      "id": "rec_150",
      "reference": "VR-24149",
      "plate": "PHC-338-MN",
      "method": "rfid",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "id": "loc_apapa",
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "position": {
        "lat": 6.44858,
        "lng": 3.36115
      },
      "recordedAt": "2026-10-24T10:20:00.550Z",
      "receivedAt": "2026-10-24T10:20:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": "valid",
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-92040",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30279",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30279",
        "status": "pending"
      }
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- No 30-day limit for administrators: the SRD's "last 30 days" default applies to an agent's own history in the mobile app. Accept any period, including a custom range.

[↑ Back to the list](#endpoints)

---

### 24. Audit trail

`GET /api/v1/audit-trail`

Every recorded verification attempt with its audit fields: agent, organization, time, method, processed identifier, result, attempt status, sync status, device and related records.

- **Used by:** Audit trail page (document 12.2)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                          | Type                                                                               | Required | Can be null |
| ------------------------------ | ---------------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`             | string                                                                             | yes      | yes         |
| `entries`                      | array of objects                                                                   | yes      | no          |
| `entries[].id`                 | string                                                                             | yes      | no          |
| `entries[].reference`          | string                                                                             | yes      | no          |
| `entries[].plate`              | string                                                                             | yes      | no          |
| `entries[].method`             | string (coded value) — see _Verification method_                                   | yes      | yes         |
| `entries[].result`             | string (coded value) — see _Verification outcome_                                  | yes      | yes         |
| `entries[].agent`              | object                                                                             | yes      | no          |
| `entries[].agent.id`           | string                                                                             | yes      | no          |
| `entries[].agent.name`         | string                                                                             | yes      | no          |
| `entries[].location`           | object                                                                             | yes      | no          |
| `entries[].location.id`        | string                                                                             | yes      | no          |
| `entries[].location.name`      | string                                                                             | yes      | no          |
| `entries[].location.area`      | string                                                                             | yes      | no          |
| `entries[].location.code`      | string                                                                             | yes      | no          |
| `entries[].position`           | object                                                                             | yes      | yes         |
| `entries[].position.lat`       | number                                                                             | yes      | no          |
| `entries[].position.lng`       | number                                                                             | yes      | no          |
| `entries[].recordedAt`         | string                                                                             | yes      | no          |
| `entries[].receivedAt`         | string                                                                             | yes      | yes         |
| `entries[].source`             | string (coded value) — see _Record source_                                         | yes      | yes         |
| `entries[].syncStatus`         | string (coded value) — see _Sync status_                                           | yes      | yes         |
| `entries[].etag`               | string (coded value) — see _E-Tag result_                                          | yes      | yes         |
| `entries[].provenance`         | string (coded value) — see _Provenance_                                            | yes      | yes         |
| `entries[].attempt`            | string (coded value) — see _Attempt status_                                        | yes      | yes         |
| `entries[].vehicle`            | object                                                                             | yes      | no          |
| `entries[].vehicle.id`         | string                                                                             | yes      | yes         |
| `entries[].vehicle.type`       | string                                                                             | yes      | yes         |
| `entries[].tripId`             | string                                                                             | yes      | yes         |
| `entries[].actionTaken`        | string (coded value) — see _Action taken_                                          | yes      | yes         |
| `entries[].violation`          | object                                                                             | yes      | yes         |
| `entries[].violation.id`       | string                                                                             | yes      | no          |
| `entries[].violation.category` | string                                                                             | yes      | no          |
| `entries[].violation.status`   | string (coded value) — see _Case, payment, trip or SOS status (by context)_        | yes      | no          |
| `entries[].payment`            | object                                                                             | yes      | yes         |
| `entries[].payment.id`         | string                                                                             | yes      | no          |
| `entries[].payment.status`     | string (coded value) — see _Case, payment, trip or SOS status (by context)_        | yes      | no          |
| `entries[].organization`       | string                                                                             | yes      | yes         |
| `entries[].identifier`         | object                                                                             | yes      | yes         |
| `entries[].identifier.kind`    | string (coded value) — see _Feed kind / photo kind / identifier kind (by context)_ | yes      | no          |
| `entries[].identifier.value`   | string                                                                             | yes      | no          |
| `entries[].identifier.masked`  | boolean                                                                            | yes      | no          |
| `entries[].device`             | object                                                                             | yes      | yes         |
| `entries[].device.id`          | string                                                                             | yes      | no          |
| `entries[].device.appVersion`  | string                                                                             | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "entries": [
    {
      "id": "rec_151",
      "reference": "VR-24150",
      "plate": "KJA-482-XY",
      "method": "ocr",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "id": "loc_ikeja_gate",
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "position": {
        "lat": 6.5996,
        "lng": 3.34973
      },
      "recordedAt": "2026-10-24T10:40:00.550Z",
      "receivedAt": "2026-10-24T10:40:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": null,
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-85627",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30280",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30280",
        "status": "pending"
      },
      "organization": "Zone 1",
      "identifier": {
        "kind": "plate",
        "value": "KJA-482-XY",
        "masked": false
      },
      "device": {
        "id": "JRB-MD-0142",
        "appVersion": "2.4.0"
      }
    },
    {
      "id": "rec_150",
      "reference": "VR-24149",
      "plate": "PHC-338-MN",
      "method": "rfid",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "id": "loc_apapa",
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "position": {
        "lat": 6.44858,
        "lng": 3.36115
      },
      "recordedAt": "2026-10-24T10:20:00.550Z",
      "receivedAt": "2026-10-24T10:20:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": "valid",
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-92040",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30279",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30279",
        "status": "pending"
      },
      "organization": "Zone 2",
      "identifier": {
        "kind": "rfid_tag",
        "value": "•••• •••• E706",
        "masked": true
      },
      "device": {
        "id": "JRB-MD-0145",
        "appVersion": "2.4.0"
      }
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Complete access for authorized administrators; supervisors as the backend's permissions allow (the module key is `audit`).
- No audit record is ever edited or deleted.
- The processed identifier is subject to access rules: never the raw RFID value.

[↑ Back to the list](#endpoints)

---

### 25. Synchronization

`GET /api/v1/synchronization`

The records CHL received, each with the synchronization status stored with it, where it came from (offline-origin where known), its evidence upload and when CHL received it.

- **Used by:** Synchronization page (document 13)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                          | Type                                                                        | Required | Can be null |
| ------------------------------ | --------------------------------------------------------------------------- | -------- | ----------- |
| `latestReceivedAt`             | string                                                                      | yes      | yes         |
| `records`                      | array of objects                                                            | yes      | no          |
| `records[].id`                 | string                                                                      | yes      | no          |
| `records[].reference`          | string                                                                      | yes      | no          |
| `records[].plate`              | string                                                                      | yes      | no          |
| `records[].method`             | string (coded value) — see _Verification method_                            | yes      | yes         |
| `records[].result`             | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `records[].agent`              | object                                                                      | yes      | no          |
| `records[].agent.id`           | string                                                                      | yes      | no          |
| `records[].agent.name`         | string                                                                      | yes      | no          |
| `records[].location`           | object                                                                      | yes      | no          |
| `records[].location.id`        | string                                                                      | yes      | no          |
| `records[].location.name`      | string                                                                      | yes      | no          |
| `records[].location.area`      | string                                                                      | yes      | no          |
| `records[].location.code`      | string                                                                      | yes      | no          |
| `records[].position`           | object                                                                      | yes      | yes         |
| `records[].position.lat`       | number                                                                      | yes      | no          |
| `records[].position.lng`       | number                                                                      | yes      | no          |
| `records[].recordedAt`         | string                                                                      | yes      | no          |
| `records[].receivedAt`         | string                                                                      | yes      | yes         |
| `records[].source`             | string (coded value) — see _Record source_                                  | yes      | yes         |
| `records[].syncStatus`         | string (coded value) — see _Sync status_                                    | yes      | yes         |
| `records[].etag`               | string (coded value) — see _E-Tag result_                                   | yes      | yes         |
| `records[].provenance`         | string (coded value) — see _Provenance_                                     | yes      | yes         |
| `records[].attempt`            | string (coded value) — see _Attempt status_                                 | yes      | yes         |
| `records[].vehicle`            | object                                                                      | yes      | no          |
| `records[].vehicle.id`         | string                                                                      | yes      | yes         |
| `records[].vehicle.type`       | string                                                                      | yes      | yes         |
| `records[].tripId`             | string                                                                      | yes      | yes         |
| `records[].actionTaken`        | string (coded value) — see _Action taken_                                   | yes      | yes         |
| `records[].violation`          | object                                                                      | yes      | yes         |
| `records[].violation.id`       | string                                                                      | yes      | no          |
| `records[].violation.category` | string                                                                      | yes      | no          |
| `records[].violation.status`   | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `records[].payment`            | object                                                                      | yes      | yes         |
| `records[].payment.id`         | string                                                                      | yes      | no          |
| `records[].payment.status`     | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "records": [
    {
      "id": "rec_151",
      "reference": "VR-24150",
      "plate": "KJA-482-XY",
      "method": "ocr",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "location": {
        "id": "loc_ikeja_gate",
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "position": {
        "lat": 6.5996,
        "lng": 3.34973
      },
      "recordedAt": "2026-10-24T10:40:00.550Z",
      "receivedAt": "2026-10-24T10:40:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": null,
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-85627",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30280",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30280",
        "status": "pending"
      }
    },
    {
      "id": "rec_150",
      "reference": "VR-24149",
      "plate": "PHC-338-MN",
      "method": "rfid",
      "result": "no_active_trip",
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "location": {
        "id": "loc_apapa",
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "position": {
        "lat": 6.44858,
        "lng": 3.36115
      },
      "recordedAt": "2026-10-24T10:20:00.550Z",
      "receivedAt": "2026-10-24T10:20:30.550Z",
      "source": "live",
      "syncStatus": "synced",
      "etag": "valid",
      "provenance": "live_backend",
      "attempt": "successful",
      "vehicle": {
        "id": "VH-92040",
        "type": "12/14 tyres and its equivalent"
      },
      "tripId": null,
      "actionTaken": "violation_issued",
      "violation": {
        "id": "VIO-30279",
        "category": "No Active CHL Trip",
        "status": "payment_pending"
      },
      "payment": {
        "id": "DN-30279",
        "status": "pending"
      }
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Received data only: the dashboard cannot know about actions still stored on an offline phone.

[↑ Back to the list](#endpoints)

---

### 26. Field operational status

`GET /api/v1/field-status`

Each agent's last-reported RFID reader, internet and GPS status in the area and period, with when it was reported and received.

- **Used by:** Field operational status page (document 13)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name           | Required | Meaning                                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `scope`        | yes      | The area's id in CHL (see _Areas_); must be one of the user's areas or inside them, otherwise 403. |
| `range`        | yes      | One of `today`, `7d`, `14d`, `30d`, `90d`, `custom`.                                               |
| `from`         | yes      | First day of the period, `YYYY-MM-DD`, Africa/Lagos time (the dashboard always sends it).          |
| `to`           | yes      | Last day of the period, inclusive, `YYYY-MM-DD`, Africa/Lagos time.                                |
| `agent`        | no       | An agent ID (`JRB-AG-0142`): only that agent's records.                                            |
| `organization` | no       | A vendor / organization name: only its agents' records.                                            |

#### Response

`200 OK`, JSON:

| Field                     | Type                                            | Required | Can be null |
| ------------------------- | ----------------------------------------------- | -------- | ----------- |
| `provided`                | boolean                                         | yes      | no          |
| `latestReceivedAt`        | string                                          | yes      | yes         |
| `devices`                 | array of objects                                | yes      | no          |
| `devices[].agent`         | object                                          | yes      | no          |
| `devices[].agent.id`      | string                                          | yes      | no          |
| `devices[].agent.name`    | string                                          | yes      | no          |
| `devices[].organization`  | string                                          | yes      | yes         |
| `devices[].location`      | object                                          | yes      | yes         |
| `devices[].location.name` | string                                          | yes      | no          |
| `devices[].location.area` | string                                          | yes      | no          |
| `devices[].location.code` | string                                          | yes      | no          |
| `devices[].reportedAt`    | string                                          | yes      | no          |
| `devices[].receivedAt`    | string                                          | yes      | yes         |
| `devices[].rfidReader`    | string (coded value) — see _RFID reader status_ | yes      | yes         |
| `devices[].internet`      | string (coded value) — see _Internet status_    | yes      | yes         |
| `devices[].gps`           | string (coded value) — see _GPS status_         | yes      | yes         |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "provided": true,
  "latestReceivedAt": "2026-10-24T10:40:30.550Z",
  "devices": [
    {
      "agent": {
        "id": "JRB-AG-0142",
        "name": "Tunde Okafor"
      },
      "organization": "Zone 1",
      "location": {
        "name": "Ikeja Gate 3",
        "area": "Lagos",
        "code": "LOS-01"
      },
      "reportedAt": "2026-10-24T10:40:00.550Z",
      "receivedAt": "2026-10-24T10:40:30.550Z",
      "rfidReader": "connected",
      "internet": "connected",
      "gps": "enabled"
    },
    {
      "agent": {
        "id": "JRB-AG-0145",
        "name": "Ada Nwosu"
      },
      "organization": "Zone 2",
      "location": {
        "name": "Apapa Port Rd",
        "area": "Lagos",
        "code": "LOS-07"
      },
      "reportedAt": "2026-10-24T10:20:00.550Z",
      "receivedAt": "2026-10-24T10:20:30.550Z",
      "rfidReader": "connected",
      "internet": "connected",
      "gps": "enabled"
    }
  ]
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Send `provided: false` (and an empty `devices`) if CHL does not supply device status at all; send a status as `null` when it is not supplied.
- One entry per agent: their latest report in the period.
- Last reported, never current: the dashboard always shows the time it was reported.
- The module key is `field-status`: include it in `user.modules` for users who may open this page.

[↑ Back to the list](#endpoints)

---

### 27. Search

`GET /api/v1/search`

Vehicles by plate or CHL vehicle ID, agents by name or ID, and verifications, violations, payment requests and trips by reference, in an area.

- **Used by:** Search results page (top bar search)
- **Sign-in:** required — `Authorization: Bearer <access token>`
- **Changes CHL data:** no

#### Query parameters

| Name    | Required | Meaning                                         |
| ------- | -------- | ----------------------------------------------- |
| `q`     | yes      | What the user typed, at least 2 characters.     |
| `scope` | yes      | The area to search: the user's own widest area. |

#### Response

`200 OK`, JSON:

| Field                                | Type                                                                        | Required | Can be null |
| ------------------------------------ | --------------------------------------------------------------------------- | -------- | ----------- |
| `query`                              | string                                                                      | yes      | no          |
| `vehicles`                           | array of objects                                                            | yes      | no          |
| `vehicles[].plate`                   | string                                                                      | yes      | no          |
| `vehicles[].vehicleId`               | string                                                                      | yes      | yes         |
| `vehicles[].vehicleType`             | string                                                                      | yes      | yes         |
| `vehicles[].verifications`           | integer (0 or more)                                                         | yes      | no          |
| `vehicles[].lastRecordedAt`          | string                                                                      | yes      | no          |
| `agents`                             | array of objects                                                            | yes      | no          |
| `agents[].id`                        | string                                                                      | yes      | no          |
| `agents[].name`                      | string                                                                      | yes      | no          |
| `agents[].organization`              | string                                                                      | yes      | yes         |
| `verifications`                      | array of objects                                                            | yes      | no          |
| `verifications[].id`                 | string                                                                      | yes      | no          |
| `verifications[].reference`          | string                                                                      | yes      | no          |
| `verifications[].plate`              | string                                                                      | yes      | no          |
| `verifications[].method`             | string (coded value) — see _Verification method_                            | yes      | yes         |
| `verifications[].result`             | string (coded value) — see _Verification outcome_                           | yes      | yes         |
| `verifications[].agent`              | object                                                                      | yes      | no          |
| `verifications[].agent.id`           | string                                                                      | yes      | no          |
| `verifications[].agent.name`         | string                                                                      | yes      | no          |
| `verifications[].location`           | object                                                                      | yes      | no          |
| `verifications[].location.id`        | string                                                                      | yes      | no          |
| `verifications[].location.name`      | string                                                                      | yes      | no          |
| `verifications[].location.area`      | string                                                                      | yes      | no          |
| `verifications[].location.code`      | string                                                                      | yes      | no          |
| `verifications[].position`           | object                                                                      | yes      | yes         |
| `verifications[].position.lat`       | number                                                                      | yes      | no          |
| `verifications[].position.lng`       | number                                                                      | yes      | no          |
| `verifications[].recordedAt`         | string                                                                      | yes      | no          |
| `verifications[].receivedAt`         | string                                                                      | yes      | yes         |
| `verifications[].source`             | string (coded value) — see _Record source_                                  | yes      | yes         |
| `verifications[].syncStatus`         | string (coded value) — see _Sync status_                                    | yes      | yes         |
| `verifications[].etag`               | string (coded value) — see _E-Tag result_                                   | yes      | yes         |
| `verifications[].provenance`         | string (coded value) — see _Provenance_                                     | yes      | yes         |
| `verifications[].attempt`            | string (coded value) — see _Attempt status_                                 | yes      | yes         |
| `verifications[].vehicle`            | object                                                                      | yes      | no          |
| `verifications[].vehicle.id`         | string                                                                      | yes      | yes         |
| `verifications[].vehicle.type`       | string                                                                      | yes      | yes         |
| `verifications[].tripId`             | string                                                                      | yes      | yes         |
| `verifications[].actionTaken`        | string (coded value) — see _Action taken_                                   | yes      | yes         |
| `verifications[].violation`          | object                                                                      | yes      | yes         |
| `verifications[].violation.id`       | string                                                                      | yes      | no          |
| `verifications[].violation.category` | string                                                                      | yes      | no          |
| `verifications[].violation.status`   | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `verifications[].payment`            | object                                                                      | yes      | yes         |
| `verifications[].payment.id`         | string                                                                      | yes      | no          |
| `verifications[].payment.status`     | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `violations`                         | array of objects                                                            | yes      | no          |
| `violations[].id`                    | string                                                                      | yes      | no          |
| `violations[].plate`                 | string                                                                      | yes      | no          |
| `violations[].category`              | string                                                                      | yes      | no          |
| `violations[].status`                | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `violations[].recordedAt`            | string                                                                      | yes      | no          |
| `payments`                           | array of objects                                                            | yes      | no          |
| `payments[].id`                      | string                                                                      | yes      | no          |
| `payments[].violationId`             | string                                                                      | yes      | no          |
| `payments[].plate`                   | string                                                                      | yes      | no          |
| `payments[].status`                  | string (coded value) — see _Case, payment, trip or SOS status (by context)_ | yes      | no          |
| `payments[].recordedAt`              | string                                                                      | yes      | no          |
| `trips`                              | array of objects                                                            | yes      | no          |
| `trips[].reference`                  | string                                                                      | yes      | no          |
| `trips[].plate`                      | string                                                                      | yes      | no          |
| `trips[].recordedAt`                 | string                                                                      | yes      | no          |

Example (from the dashboard's sample data; long lists shortened to two items):

```json
{
  "query": "KJA-482",
  "vehicles": [
    {
      "plate": "KJA-482-XY",
      "vehicleId": "VH-85627",
      "vehicleType": "12/14 tyres and its equivalent",
      "verifications": 33,
      "lastRecordedAt": "2026-10-24T10:40:00.550Z"
    }
  ],
  "agents": [],
  "verifications": [],
  "violations": [],
  "payments": [],
  "trips": []
}
```

#### Errors

- `401` — the access token is missing or expired (the dashboard refreshes it once and retries).
- `403` — the user may not open this module or this area.
- Every error uses the shared error body: see [README](#errors).

#### Notes

- Match ignoring case, spaces, dashes, dots and slashes: "kja 482xy" finds KJA-482-XY.
- Each vehicle, violation, payment request and trip appears once, at its latest verification. Search everything CHL holds in the area, not one period.
- Consider capping each group (for example 50) for very short queries.

[↑ Back to the list](#endpoints)

## Coded values

Fields marked _coded value_ carry one of the codes below. CHL may add codes later: the dashboard shows an unknown code as readable text, never as an error, so add new ones freely.

| Name                              | Codes                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Verification outcome              | `active_trip`, `vehicle_not_found`, `no_trip_history`, `etag_missing`, `verification_unavailable`, `expired_trip`, `tag_vehicle_mismatch`, `no_active_trip`, `invalid_etag`                                        |
| Verification method               | `rfid`, `qr`, `ocr`, `manual`                                                                                                                                                                                      |
| Record source                     | `live`, `offline`                                                                                                                                                                                                  |
| Provenance                        | `live_backend`, `cached_result`, `offline_origin`                                                                                                                                                                  |
| Sync status                       | `synced`, `evidence_pending`                                                                                                                                                                                       |
| E-Tag result                      | `valid`, `missing`, `invalid`, `mismatch`                                                                                                                                                                          |
| Attempt status                    | `successful`, `unsuccessful`                                                                                                                                                                                       |
| Action taken                      | `violation_issued`, `no_violation`                                                                                                                                                                                 |
| Case status                       | `no_violation`, `awaiting_action`, `payment_pending`, `escalated`, `resolved`, `cancelled`                                                                                                                         |
| Violation category                | `No Active CHL Trip`, `No E-Tag`, `Fake / Invalid E-Tag`, `Tampered E-Tag`, `Expired Trip`, `Refusal to Comply`, `Tag-Vehicle Mismatch`                                                                            |
| Follow-up (repeat vehicles)       | `none`, `partial`                                                                                                                                                                                                  |
| Payment status                    | `pending`, `received`                                                                                                                                                                                              |
| Payment method                    | `qr`, `ussd`, `transfer`, `generated_account`, `pos_card`, `chl_platform`                                                                                                                                          |
| Trip status                       | `active`, `closed`                                                                                                                                                                                                 |
| Trip check result                 | `active_trip`, `no_active_trip`, `no_trip_history`                                                                                                                                                                 |
| Destination detection             | `destination_detected`, `trip_completed`                                                                                                                                                                           |
| Feed kind (Command centre)        | `verification`, `violation`, `payment`, `field_report`, `load_status`, `sos`                                                                                                                                       |
| Field report type                 | `vehicle`, `driver`, `situation`, `general`                                                                                                                                                                        |
| SOS type                          | `threat_or_assault`, `medical_emergency`, `road_accident`, `vehicle_forced_through`, `crowd_or_unrest`                                                                                                             |
| SOS status                        | `open`, `closed`                                                                                                                                                                                                   |
| Load status                       | `loaded`, `empty`                                                                                                                                                                                                  |
| Tagging (payments compliance)     | `initiated`, `not_initiated`                                                                                                                                                                                       |
| Vehicle photo kind                | `front`, `rear`, `side`, `haulage_bay`                                                                                                                                                                             |
| E-Tag photo kind                  | `missing_tag`, `invalid_tag`, `other_etag`                                                                                                                                                                         |
| Processed identifier kind (audit) | `rfid_tag`, `qr_code`, `plate`                                                                                                                                                                                     |
| Notification category             | `enforcement`, `field`, `operational`                                                                                                                                                                              |
| Notification type                 | `repeat_vehicle`, `payment_received`, `sos`, `vehicle_report`, `driver_report`, `situation_report`, `general`, `load_status`                                                                                       |
| RFID reader status                | `connected`, `disconnected`                                                                                                                                                                                        |
| Internet status                   | `connected`, `disconnected`                                                                                                                                                                                        |
| GPS status                        | `enabled`, `disabled`                                                                                                                                                                                              |
| Role                              | `administrator`, `supervisor`, `principal_officer`                                                                                                                                                                 |
| Geographic level                  | `enforcement_point`, `zone`, `ward`, `lga`, `state`, `region`, `subregion`, `national`                                                                                                                             |
| Module key (`user.modules`)       | `overview`, `command-centre`, `geography`, `agents`, `verifications`, `trips`, `violations`, `evidence`, `field-reports`, `payments`, `notifications`, `repeat-alerts`, `history`, `audit`, `sync`, `field-status` |
| Period (`range`)                  | `today`, `7d`, `14d`, `30d`, `90d`, `custom`                                                                                                                                                                       |
| Command centre window             | `1h`, `today`, `24h`, `7d`                                                                                                                                                                                         |
