# CLAUDE.md --- ITEIME Backend Project Instructions

## 1. Your role

Act as a senior backend engineering team working through the Claude Code
CLI. Work carefully, inspect the existing repository and supplied
requirements before making changes, and explain important architectural
decisions. Prioritize correctness, security, maintainability,
testability, and alignment with the project documents over speed or
speculative feature additions.

The immediate objective is to **establish the backend project structure
and foundational engineering conventions** for the ITEIME Enforcement
Engine. Do not attempt to implement every business feature in one pass.
First inspect, plan, create the structure, document assumptions, and
verify the result.

## 2. Source documents and requirement fidelity

Locate and read the project documents available in the repository or
workspace. The expected documents are:

-   `CSNI-DOC-SRD-JRB CHL ENFORCEMENT.pdf` --- JRB CHL enforcement
    mobile application requirements.
-   `_ITEIME Admin Dashboard.docx` --- ITEIME Enforcement Engine
    requirements, including modules T1--T18 and 96 submodules.
-   `Admin Dashboard.pdf` --- JRB CHL Monitoring Dashboard requirements.

If any document is missing or cannot be read, report that clearly and
continue only with requirements that are available. Do not pretend to
have inspected a document that is unavailable.

Treat these as the primary requirements sources. Preserve their
terminology and business rules. Do not silently invent requirements,
resolve contradictory rules, or turn proposed features into confirmed
requirements. Maintain a list of open questions in
`docs/requirements/open-questions.md`.

## 3. System understanding and boundaries

This project is the **ITEIME Enforcement Engine backend**, built with
Node.js, Express.js, and PostgreSQL.

The intended ecosystem contains distinct systems:

1.  **Existing JRB CHL platform** --- authoritative for the CHL-owned
    identity, agent/organizational records, vehicles, E-Tags/RFID, QR
    references, CHL trips, tariffs/levies, transactions, and payment
    records as defined by its existing services.
2.  **ITEIME backend** --- the Enforcement Engine's dedicated backend.
    It owns ITEIME business workflows and records, exposes APIs needed
    by the mobile application and both dashboards, and integrates with
    CHL through documented contracts.
3.  **JRB CHL Enforcement Flutter mobile application** --- field
    operations: authentication through the approved CHL integration,
    vehicle verification, trip/E-Tag checks, GPS, evidence, violations,
    demand/payment status, field reports, offline queues,
    synchronization, history, and notifications.
4.  **ITEIME Admin Dashboard** --- the Enforcement Engine's operational
    interface for case intake and management, assignment,
    investigations, multi-actor accountability, linked cases, tag
    workflows, intelligence, suspect records, legal workflows, financial
    adjustments, collaboration, notifications, and related
    administration.
5.  **JRB CHL Monitoring Dashboard** --- a separate, primarily read-only
    interface for monitoring authorized agent activity and enforcement
    operations through approved APIs/data, including verification
    activity, trips, violations, unresolved cases, repeat-vehicle
    alerts, locations, payment updates, field reports, synchronization,
    and audit history.

### Integration principles

-   Treat ITEIME as the central integration layer in the intended
    architecture, while respecting the actual contracts and access paths
    documented by CHL.
-   Do not assume the mobile application must call CHL directly for
    every request. Determine per integration whether the request goes
    through ITEIME or directly to an existing CHL service.
-   Do not assume every system shares one database. Use ITEIME's
    database for ITEIME-owned records; access CHL-owned information
    through approved APIs unless explicit data-sharing or replication
    requirements are provided.
-   Do not build a second CHL identity, vehicle-registration, E-Tag
    issuance, tariff-configuration, or trip-creation system.
-   Keep the ITEIME Admin Dashboard and Monitoring Dashboard distinct.
    The Monitoring Dashboard must not gain write/administrative
    capabilities just because an API exists for the Admin Dashboard.
-   Do not create separate microservices merely for appearance. Start
    with a well-modularized backend unless document evidence, deployment
    constraints, or a documented decision requires independently
    deployed services.
-   Treat the architecture diagram and API routing as proposed until
    verified against existing CHL API specifications and stakeholder
    decisions.

## 4. Technology baseline

Use the following baseline unless the repository already has an
established, working convention that should be preserved:

-   Node.js LTS supported by the deployment environment.
-   TypeScript in strict mode.
-   Express.js.
-   PostgreSQL.
-   Prisma ORM and migrations, unless an existing repository standard or
    a documented constraint requires a different migration/ORM approach.
-   REST APIs with explicit versioning, initially `/api/v1`.
-   OpenAPI documentation for the APIs.
-   Automated tests with a maintained TypeScript-compatible test runner.
-   ESLint and Prettier (or equivalent existing repository tooling).
-   Environment-variable validation at startup.
-   Structured logging with request/correlation IDs and redaction of
    sensitive fields.
-   Docker and a local development Compose setup only if compatible with
    the existing project and useful for reproducibility.

Do not add Redis, queues, object storage, WebSockets, SMS/email vendors,
payment providers, AI services, or other infrastructure dependencies
until requirements and integration choices justify them. Where a future
feature needs one, define an interface and record the decision rather
than hard-coding an unapproved provider.

## 5. First task: inspect before changing files

Before creating or editing anything:

1.  Inspect the current working directory, Git status, existing files,
    package manifests, source code, tests, environment examples, and
    project instructions.
2.  Locate the three source documents and inspect their content. If a
    PDF/DOCX cannot be extracted using available tools, report the
    limitation and request or use a readable copy if available.
3.  Determine whether this is an empty repository, an existing
    application, or a partially implemented backend.
4.  Identify existing conventions worth preserving and risks of
    overwriting current work.
5.  Produce a short implementation plan before significant changes.
6.  Do not delete, reset, overwrite, or rename existing files without
    checking their purpose and preserving user work.
7.  Do not print secrets from `.env` files or other credentials. Inspect
    variable names and configuration shape only; redact values.

## 6. Initial deliverable: project structure, not full feature implementation

The first implementation pass should create or adapt a maintainable
project skeleton. A suggested structure is below; adjust it to the
repository after inspection and explain material deviations.

``` text
.
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example
├── .editorconfig
├── eslint.config.js
├── prettier.config.js
├── Dockerfile
├── compose.yaml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture/
│   │   ├── system-context.md
│   │   ├── component-boundaries.md
│   │   └── data-ownership.md
│   ├── api/
│   │   ├── api-conventions.md
│   │   └── openapi.yaml
│   ├── requirements/
│   │   ├── requirements-traceability.md
│   │   └── open-questions.md
│   └── decisions/
│       └── README.md
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── shared/
│   │   ├── errors/
│   │   ├── http/
│   │   ├── middleware/
│   │   ├── types/
│   │   └── utils/
│   ├── integrations/
│   │   └── chl/
│   │       ├── chl.client.ts
│   │       ├── chl.types.ts
│   │       └── README.md
│   ├── modules/
│   │   ├── health/
│   │   ├── auth/
│   │   ├── access-control/
│   │   ├── cases/
│   │   ├── actors/
│   │   ├── classification/
│   │   ├── linked-cases/
│   │   ├── tags/
│   │   ├── intelligence/
│   │   ├── suspect-register/
│   │   ├── legal/
│   │   ├── financial-adjustments/
│   │   ├── assignments/
│   │   ├── communications/
│   │   ├── notifications/
│   │   ├── field-operations/
│   │   ├── evidence/
│   │   ├── violations/
│   │   ├── payments/
│   │   ├── synchronization/
│   │   ├── monitoring/
│   │   └── audit/
│   └── routes/
│       └── v1/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
└── scripts/
```

This is a **candidate structure**, not a requirement to create empty
folders for every module. Only create meaningful files and directories
needed for the initial foundation. Do not scaffold speculative feature
implementations or empty modules solely to make the tree look complete.
The modules listed are organizational candidates based on the documents;
refine them during requirements mapping.

### Expected foundation

At minimum, after the first pass:

-   The application starts using a documented local command.
-   The Express app and server startup are separated.
-   Configuration is validated at startup without exposing secret
    values.
-   A basic liveness endpoint exists; database readiness should be
    reported separately and accurately.
-   Central error handling, 404 handling, request IDs, and safe request
    logging are in place.
-   TypeScript, linting, formatting, and tests have working scripts.
-   PostgreSQL/Prisma configuration is prepared, but no speculative
    production schema is created before data ownership and entities are
    mapped.
-   An initial OpenAPI file describes only endpoints that actually
    exist, such as health checks.
-   The CHL integration is represented by a typed adapter/interface and
    documented contract boundary; do not invent CHL URLs, token formats,
    endpoints, payloads, or credentials.
-   A README explains setup, commands, environment variables,
    migrations, tests, and current limitations.
-   Architecture notes and open questions are written from the documents
    and actual repository findings.

## 7. Business rules that must remain explicit

These rules are important when the corresponding modules are
implemented:

-   CHL is authoritative for the data and services it owns.
-   A failed network/API request is **not** equivalent to "no active
    trip." Return a verification-unavailable/error state rather than a
    false negative.
-   An absent active trip does not automatically prove a violation;
    applicable business checks, including whether the vehicle is
    carrying haulage goods, must be followed.
-   Invalid E-Tags and missing E-Tags are distinct outcomes.
    Tag-to-vehicle mismatch is also distinct.
-   Do not expose raw RFID values to the field agent or unnecessarily
    log them.
-   Every verification attempt, including unsuccessful attempts, must be
    auditable.
-   GPS is required for each verification as stated by the mobile SRD;
    define and document behavior when location cannot be obtained rather
    than silently fabricating coordinates.
-   A violation must not bypass required camera evidence and associated
    metadata.
-   Payment status must come from authoritative, verifiable payment
    information. A client request must never be sufficient to mark a
    demand as paid.
-   Offline actions need durable queuing, safe retry behavior,
    idempotency, clear conflict/error states, and duplicate prevention.
-   Repeat-vehicle alerting is based on three qualifying reports without
    appropriate follow-up, not merely three scans. The exact qualifying
    criteria must be confirmed and documented.
-   Enforce server-side role and geographical permissions for dashboard
    data. Do not rely on frontend hiding alone.
-   Case state changes must enforce valid transitions and produce audit
    history.
-   Financial adjustments/refunds require documented approval rules; do
    not invent approval authority or silently automate refunds.
-   Preserve sensitive evidence and personal data using least-privilege
    access, secure storage interfaces, retention decisions, and audit
    trails.

## 8. Security and engineering rules

-   Validate all external input at API boundaries.
-   Use centralized, safe error responses; do not leak stack traces,
    database details, tokens, or secrets to clients.
-   Apply authentication and authorization at the server, not only in
    the UI.
-   Use least privilege for database credentials and integrations.
-   Keep secrets out of source control, logs, test fixtures,
    documentation, and generated examples.
-   Do not log passwords, access/refresh tokens, raw payment
    credentials, or sensitive raw identifiers.
-   Add rate limiting and request-size limits appropriate to the
    endpoints; design upload limits separately for evidence.
-   Treat uploads and external service responses as untrusted input.
-   Use timeouts, bounded retries, and clear failure handling for
    CHL/external calls. Do not retry non-idempotent operations blindly.
-   Use transactions where a business operation needs atomic writes.
-   Make migrations explicit and reviewable. Never run destructive
    production migrations or commands without clear approval.
-   Add tests for authorization boundaries, invalid transitions,
    idempotency, failed upstream services, and important business rules
    as those modules are built.
-   Do not claim that a feature is secure or production-ready without
    tests or evidence supporting the claim.

## 9. API and code organization conventions

Use modular boundaries. Where a module is implemented, prefer a pattern
such as:

``` text
modules/<module-name>/
├── <module>.routes.ts
├── <module>.controller.ts
├── <module>.service.ts
├── <module>.repository.ts
├── <module>.schema.ts
├── <module>.types.ts
└── <module>.test.ts
```

Adapt this pattern when a module is small or an established repository
convention is better. Avoid needless abstraction.

-   Routes define HTTP paths and middleware.
-   Controllers translate HTTP requests/responses and remain thin.
-   Services hold business rules and coordinate operations.
-   Repositories handle persistence.
-   Integration adapters isolate CHL and other external providers.
-   Schemas validate inputs and, where appropriate, outputs.
-   Shared code must not become a dumping ground for business logic.
-   Keep API error formats, pagination, filtering, timestamps, and
    naming conventions consistent.
-   Use UTC for persisted timestamps unless a documented business rule
    requires otherwise; retain the relevant location/time-zone context
    when it matters.
-   Document idempotency behavior for operations that may be retried by
    mobile synchronization.
-   Keep OpenAPI documentation aligned with actual behavior.

## 10. Requirement traceability and unresolved decisions

Create `docs/requirements/requirements-traceability.md` to map each
major requirement to:

-   Source document and section/module.
-   Owning system (CHL, ITEIME backend, mobile app, ITEIME Admin
    Dashboard, or Monitoring Dashboard).
-   Backend module/API responsibility.
-   Implementation status (not started, designed, implemented, tested,
    or blocked).
-   Open question or dependency.

Create `docs/requirements/open-questions.md`. At a minimum, verify and
record questions around:

-   CHL API base URLs, API specifications, sandbox access,
    authentication/token lifecycle, account deactivation, and service
    ownership.
-   Which mobile calls go directly to CHL versus through ITEIME.
-   Ownership and synchronization of CHL versus ITEIME data.
-   Agent, supervisor, Principal Officer, administrator, IRS, legal,
    finance, and other role/permission mappings.
-   Case lifecycle version and valid transitions.
-   SLA durations and escalation thresholds.
-   Tag lifecycle rules and the unresolved assignment of tag statuses.
-   Refund/financial-adjustment approval authority and reconciliation.
-   Payment providers, signed webhook verification, and source of
    payment truth.
-   Evidence storage, resumable upload protocol, file types/limits,
    retention, and access.
-   Offline cache freshness, queued action rules, conflict resolution,
    and synchronization guarantees.
-   Repeat-vehicle qualifying-report definition and follow-up rules.
-   GPS accuracy thresholds and behavior when location permission or GPS
    is unavailable.
-   Notification providers, delivery guarantees, and retry policies.
-   Privacy, legal retention, audit access, and data residency
    requirements.
-   Deployment topology, hosting, observability, backups, recovery
    objectives, and service-level targets.

Do not block project scaffolding on every open question. Build safe
foundations, document blockers, and do not fabricate the missing
integration details.

## 11. Work phases

Follow these phases and stop at the requested scope unless the user
authorizes the next phase.

### Phase 1 --- Inspect and scaffold

-   Inspect repository and all available source documents.
-   Summarize existing state and any conflicts.
-   Create/adapt the backend structure and engineering configuration.
-   Add health endpoints, central middleware, environment validation,
    test/lint/format scripts, initial OpenAPI, README, architecture
    notes, traceability, and open questions.
-   Configure PostgreSQL/Prisma safely without inventing a full business
    schema.
-   Run available checks and report actual results.

### Phase 2 --- Architecture and data model

-   Map requirements to domains and ownership.
-   Define context/component diagrams and API boundaries.
-   Propose entities and relationships.
-   Identify which data is local to ITEIME and which remains
    authoritative in CHL.
-   Record decisions in short Architecture Decision Records (ADRs).
-   Review unresolved questions before committing to risky design
    choices.

### Phase 3 --- Core platform services

After architecture review, implement foundations such as authentication
integration, authorization, audit logging, CHL adapter, error handling,
and API conventions, using verified contracts and test doubles where
upstream access is unavailable.

### Phase 4 --- Business modules

Implement and test modules in a dependency-aware sequence agreed with
the user. Do not build every module at once.

### Phase 5 --- Integration and production readiness

Run unit, integration, contract, security, and end-to-end tests; review
logging and monitoring; document deployment, migration, backup,
recovery, and release procedures.

## 12. How to work with the user

-   Be transparent about what was inspected, created, changed, tested,
    and left incomplete.
-   Before substantial edits, give a concise plan.
-   Ask focused questions only when a decision is essential; otherwise
    record uncertainty and proceed safely.
-   Do not repeatedly ask for information already present in the source
    documents or repository.
-   Do not claim to have run a command or test unless it actually ran
    and its result was observed.
-   If a tool, document, integration, or dependency is unavailable,
    state the limitation and provide the next practical step.
-   Keep changes small, reviewable, and reversible.
-   Do not start implementing the complete backend merely because the
    scaffold is ready.

## 13. Definition of done for the initial task

The initial project-structure task is complete when:

-   The existing repository was inspected and preserved.
-   The three source documents were checked where available.
-   The backend has a clear, working TypeScript/Express foundation.
-   Configuration and database connection setup are explicit and safe.
-   Health endpoints, middleware, and basic tests work.
-   Lint, format, build/type-check, and test commands are documented and
    run where possible.
-   The initial API specification reflects only implemented endpoints.
-   Architecture, data ownership, traceability, and open questions are
    documented.
-   No CHL endpoint, secret, provider, schema, or business rule was
    invented.
-   A final report lists created/modified files, commands run and their
    results, assumptions, blockers, and recommended next phase.

**Start now with Phase 1. Inspect the actual workspace first, then
implement only the initial project structure and foundation.**
