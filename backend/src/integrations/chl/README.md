# CHL integration boundary

All ITEIME access to the existing JRB CHL platform goes through this folder.
No other module may call CHL directly.

## Current state

There is **no confirmed CHL API contract** (base URLs, authentication, token
formats, endpoints, payloads): see open questions Q-CHL-1 to Q-CHL-12. So this
folder defines only:

- `chl.types.ts`: the vocabulary from the SRD (verification outcomes §15,
  methods §8) and the failure kinds of a CHL call.
- `chl.client.ts`: `ChlError` and the `ChlClient` interface. The interface has
  no operations yet.

No CHL URL, credential, endpoint or payload has been invented here.

## Rules for adding operations

1. Add an operation only when it appears in the CHL API specification (or a
   signed-off contract), and cite the section in a comment.
2. Map CHL responses into ITEIME types here. Wire formats never leak into
   services.
3. Use a timeout (`CHL_TIMEOUT_MS`) on every call. Retry only idempotent calls,
   with a bounded number of attempts and backoff.
4. Network errors, timeouts, 5xx responses and invalid responses become
   `ChlError` (`unavailable`, `invalid_response`, …). They must **never**
   become "no active trip", "vehicle not found" or any other business outcome
   (SRD §26.2, §33.2, acceptance criterion 12).
5. Never log raw RFID values, tokens or credentials.
6. Provide a test double (an in-memory implementation of `ChlClient`) for
   tests, and contract tests against recorded CHL responses once a sandbox
   exists.

`iteime_backend/src/integrations/chl` has a mock and an HTTP skeleton built
from a _requirements request_ to the CHL team. That request is a useful
reference, but it is not a confirmed contract.
