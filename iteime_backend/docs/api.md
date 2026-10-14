<!-- Part of the iteime_backend docs; see ../README.md. -->

# Mobile API v1

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
