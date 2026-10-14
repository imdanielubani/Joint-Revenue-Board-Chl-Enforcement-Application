# Component boundaries

## One deployable, many modules

ITEIME starts as **one modular Express application**. No document or
deployment constraint yet requires independently deployed services. Modules
are split into separate services only when an ADR justifies it.

## Layers inside a module

```
routes  →  controller  →  service  →  repository  →  Prisma (ITEIME DB)
                              └─────→  integrations/chl  →  CHL (HTTP)
```

| Layer              | Responsibility                                                                                                                                        | May depend on                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `*.routes.ts`      | Paths, middleware (auth, validation, rate limits)                                                                                                     | controller, shared middleware              |
| `*.controller.ts`  | HTTP request ⇄ service call ⇄ HTTP response; thin                                                                                                     | service, schemas                           |
| `*.service.ts`     | Business rules, transactions, authorization decisions, audit events                                                                                   | repositories, integrations, other services |
| `*.repository.ts`  | Persistence only                                                                                                                                      | Prisma client                              |
| `*.schema.ts`      | zod validation of inputs (and outputs where useful)                                                                                                   | —                                          |
| `integrations/chl` | The only code that talks to CHL. Timeouts, bounded retries for idempotent calls only, and failures mapped to `ChlError` (never to a business outcome) | —                                          |
| `shared/`          | Cross-cutting technical code (errors, middleware, HTTP helpers). **No business rules.**                                                               | —                                          |

Small modules may merge layers (for example, `health` has routes and a service
only).

## Current modules

| Path                   | Contents                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| `src/modules/health`   | Liveness and readiness                                                     |
| `src/integrations/chl` | Boundary types and `ChlError`; no operations until the CHL contract exists |
| `src/routes/v1`        | The `/api/v1` router (empty)                                               |

## Candidate modules

These come from the documents and will be refined in Phase 2 (traceability:
[requirements-traceability.md](../requirements/requirements-traceability.md)):
`auth`, `access-control`, `audit`, `cases`, `actors`, `classification`,
`linked-cases`, `tags`, `intelligence`, `suspect-register`, `legal`,
`financial-adjustments`, `assignments`, `communications`, `notifications`,
`field-operations`, `verification`, `evidence`, `violations`, `payments`,
`synchronization`, `monitoring`.

They are **not** created as empty folders.

## Dashboard separation

The ITEIME Admin Dashboard and the Monitoring Dashboard get **separate route
groups and permission sets**. Monitoring routes are read-only (GET only).
Monitoring routes must never reuse an Admin write route, even when the data is
the same. Authorization is enforced on the server for every route, including
geographic scope (MON §1, §4).
