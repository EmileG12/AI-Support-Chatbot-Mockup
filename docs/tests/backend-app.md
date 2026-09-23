# app.test.ts

`backend/src/app.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests the Express app exported from `backend/src/app.ts` (see [api-routes](../api-routes/README.md))
via `supertest`, so no real port is bound — this is also the only test coverage for
[conversationFlow](../backend-services/conversationFlow.md), since it's exercised through the
routes rather than unit-tested directly. Mocks `backend/src/supabaseClient.ts` (via
`backend/src/test/supabaseMock.ts`), `backend/src/duplicates.ts`, and `runAgentTurn` from
`backend/src/ticketAgent.ts` (keeping its real `TICKET_CATEGORIES`/`TICKET_PRIORITIES`/
`TICKET_STATUSES` exports via `importOriginal`, since `PATCH /api/tickets/:id` validates against
them).

## Covers

- `GET /api/tickets` applies `status`/`category`/`priority` query params as `.eq()` filters on the
  query chain, and skips filtering entirely when a param is `"all"`.
- `GET /api/tickets/:id` returns 404 when the ticket isn't found, and includes `duplicateOf` in the
  response when the ticket's `possible_duplicate_of` is set.
- `PATCH /api/tickets/:id` returns 400 for an invalid category, an empty body, and a non-boolean
  `duplicate_dismissed` (no Supabase call made in any of these), and 200 with the updated row on
  valid input (including `duplicate_dismissed: true`).
- `POST /api/chat` creates a new `conversations` row when no `conversationId` is given, and returns
  `{ reply, ticket: null, pendingContact: null }` when the (mocked) agent doesn't call a tool.
- `POST /api/chat` inserts the new ticket with `possible_duplicate_of`/`duplicate_similarity` set
  when the (mocked) duplicate lookup finds a match.
- `POST /api/chat` returns `pendingContact` and a deterministic confirmation message with exactly
  one agent call when the (mocked) agent returns `pendingContact`.
- `POST /api/chat` rejects a blank message with 400 before touching Supabase at all.
- `POST /api/conversations/:id/confirm-contact` marks contact confirmed and continues with one real
  agent call, asserting the confirmation is persisted as a **`user`**-role message (not a second
  assistant message — see [conversationFlow](../backend-services/conversationFlow.md) for why); and
  400s when contact is already confirmed.
- `PATCH /api/conversations/:id/contact` 400s on an invalid email without touching Supabase, and on
  valid input overwrites the conversation's contact fields, confirms them, and asserts the
  correction is persisted as a `user`-role message containing the corrected values.

Uses `backend/src/test/supabaseMock.ts`'s chainable query-builder mock: each `await
supabase.from(...)` call in the code under test consumes the next result queued with
`queueResult()`, in call order — so each test's `queueResult` calls mirror the exact sequence of
Supabase calls the route handler (and, transitively, `conversationFlow`) makes.
