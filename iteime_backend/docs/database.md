<!-- Part of the iteime_backend docs; see ../README.md. -->

# Database

PostgreSQL holds what ITEIME itself owns; everything about vehicles, tags and
trips stays in CHL. The schema is in `src/database/migrations/` as numbered steps.
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

## Migrations

| Command                | When                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run migrate`      | Development: bring the database up to date without starting the server |
| `npm run migrate:prod` | From the built image, before starting (the server also does it itself) |

To change the schema:

1. Add `src/database/migrations/00N_<name>.ts`, exporting a `Migration`
   with that ID and its SQL.
2. Append it to the list in `src/database/migrations/index.ts`.

Each step runs in its own transaction, so a failing step changes nothing.
The `schema_migrations` table records which steps ran.
