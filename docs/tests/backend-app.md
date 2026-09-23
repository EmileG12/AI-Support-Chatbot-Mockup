# app.test.ts

`backend/src/app.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests the Express app exported from `backend/src/app.ts` (see [api-routes](../api-routes/README.md))
via `supertest`, so no real port is bound. Mocks `backend/src/supabaseClient.ts` (via
`backend/src/test/supabaseMock.ts`), `backend/src/duplicates.ts`, and `runAgentTurn` from
`backend/src/ticketAgent.ts` (keeping its real `TICKET_CATEGORIES`/`TICKET_PRIORITIES`/
`TICKET_STATUSES` exports via `importOriginal`, since `PATCH /api/tickets/:id` validates against
them).

## Covers

- `GET /api/tickets` applies `status`/`category`/`priority` query params as `.eq()` filters on the
  query chain, and skips filtering entirely when a param is `"all"`.
- `GET /api/tickets/:id` returns 404 when the ticket isn't found, and includes `duplicateOf` in the
  response when the ticket's `possible_duplicate_of` is set.
- `PATCH /api/tickets/:id` returns 400 for an invalid category and for an empty body (no
  Supabase call made in either case), and 200 with the updated row on valid input.
- `POST /api/chat` creates a new `conversations` row when no `conversationId` is given, and returns
  `{ reply, ticket: null }` when the (mocked) agent doesn't call `create_ticket`.
- `POST /api/chat` inserts the new ticket with `possible_duplicate_of`/`duplicate_similarity` set
  when the (mocked) duplicate lookup finds a match.
- `POST /api/chat` rejects a blank message with 400 before touching Supabase at all.

Uses `backend/src/test/supabaseMock.ts`'s chainable query-builder mock: each `await
supabase.from(...)` call in the code under test consumes the next result queued with
`queueResult()`, in call order — so each test's `queueResult` calls mirror the exact sequence of
Supabase calls the route handler makes.
