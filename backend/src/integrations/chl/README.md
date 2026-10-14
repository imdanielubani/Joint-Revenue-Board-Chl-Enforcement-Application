# CHL integration boundary

All ITEIME access to the existing JRB CHL platform goes through this folder.
No other module may call CHL directly
([ADR-0006](../../../docs/decisions/0006-chl-integration-boundary.md)).

## Current state (Phase 3)

There is **no confirmed CHL API contract**: base URLs, authentication, token
formats, endpoints and payloads are all unknown (open questions Q-CHL-1 to
Q-CHL-15). **No live CHL integration exists.** No CHL URL, credential,
endpoint or payload has been invented here.

| File                              | What it is                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `chl.types.ts`                    | Vocabulary from the SRD (verification outcomes §15, methods §8) and the failure kinds of a CHL call          |
| `chl.client.ts`                   | `ChlError`: a call that produced no answer. Never a business outcome                                         |
| `chl.identity.ts`                 | `ChlIdentityClient`: the SRD §5 identity capabilities in ITEIME's terms, with zod schemas for the answers    |
| `chl.guard.ts`                    | Wraps any client: timeout, failure mapping, answer validation, safe logging, no retries                      |
| `unconfigured-identity-client.ts` | `CHL_IDENTITY_PROVIDER=none` (default): every call fails `not_configured`                                    |
| `fake/fake-identity-client.ts`    | **FAKE**: synthetic accounts (`@example.test`, `FAKE-` IDs) for development and tests. Refused in production |
| `index.ts`                        | `createIdentityClient(config)`: picks the client from configuration and wraps it in the guard                |

### Using the fake locally

Set `CHL_IDENTITY_PROVIDER=fake` in `.env`. Every response then carries
`X-ITEIME-Fake-CHL: true`. All fake accounts share the synthetic password
`fake-chl-password`:

| Email                            | Role                 | Notes                   |
| -------------------------------- | -------------------- | ----------------------- |
| `agent.one@example.test`         | ENFORCEMENT_AGENT    | LGA scope               |
| `agent.deactivated@example.test` | ENFORCEMENT_AGENT    | Deactivated             |
| `supervisor@example.test`        | SUPERVISOR           | State scope             |
| `principal.officer@example.test` | PRINCIPAL_OFFICER    | State scope             |
| `admin@example.test`             | SYSTEM_ADMINISTRATOR | National scope          |
| `unknown.role@example.test`      | (unrecognized role)  | Gets no access anywhere |

## Rules for adding operations

1. Add an operation only when it appears in the CHL API specification (or a
   signed-off contract), and cite the section in a comment.
2. Map CHL responses into ITEIME types here. Wire formats never leak into
   services.
3. Wrap every client in `guardIdentityClient` (or an equivalent guard for new
   capabilities). It gives each call a timeout (`CHL_TIMEOUT_MS`). Retry only
   operations the contract confirms idempotent, a limited number of times,
   with backoff.
4. Network errors, timeouts, 5xx responses and invalid answers become
   `ChlError`: `unavailable`, `timeout`, `invalid_response`, and so on. They
   must **never** become "no active trip", "vehicle not found", "invalid
   credentials" or any other business outcome (SRD §26.2, §33.2; acceptance
   criterion 12).
5. Never log raw RFID values, tokens, credentials, emails or CHL responses.
6. Extend the fake for every new capability, and add contract tests against
   recorded CHL responses once a sandbox exists.

The removed `iteime_backend` (git history, commit `d654c84`) had a mock and an
HTTP skeleton, built from the _requirements request_ to the CHL team
(`CHL BACKEND API REQUIREMENTS.pdf` at the repository root). That request is a
useful reference, but it is not a confirmed contract.
