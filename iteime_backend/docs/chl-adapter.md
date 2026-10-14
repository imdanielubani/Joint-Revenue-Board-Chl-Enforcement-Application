<!-- Part of the iteime_backend docs; see ../README.md. -->

# The CHL adapter

`ChlAdapter` (`src/integrations/chl/adapter.ts`) is the only way the backend reaches the
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
`src/integrations/chl/mock/mock-data.ts`, so the backend and the mobile app can be built and
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
the real CHL then changes nothing outside `src/integrations/chl/http/`.
