# app.test.ts

`backend/src/app.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests the Express app exported from `backend/src/app.ts` (see [api-routes](../api-routes/README.md))
via `supertest`, so no real port is bound — this is also the only test coverage for
[conversationFlow](../backend-services/conversationFlow.md), since it's exercised through the
routes rather than unit-tested directly. Mocks `backend/src/supabaseClient.ts` (via
`backend/src/test/supabaseMock.ts`), `backend/src/duplicates.ts`, and `runAgentTurn`/
`draftTicketSummary`/`draftResolutionSummary` from `backend/src/ticketAgent.ts` (keeping its real
`TICKET_CATEGORIES`/`TICKET_PRIORITIES`/`TICKET_STATUSES` exports via `importOriginal`, since
`PATCH /api/tickets/:id` and `POST /api/conversations/:id/staff-create-ticket` validate against
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
- `POST /api/chat` transitions a confirmed-contact conversation to `handoff_status: "queued"` when
  [working hours are on](../backend-services/settings.md) (mocked `Math.random` for a deterministic
  wait estimate), inserting the canned queued-message template **without calling the mocked
  `runAgentTurn` at all** and returning `handoffStatus`/`estimatedWaitMinutes` in the response.
- `POST /api/chat` gives an empty reply and never calls `runAgentTurn` once the conversation is
  `"queued"` — the message is just persisted for whichever side polls it next.
- `POST /api/chat` also gives an empty reply once `"live"`, but *does* call the mocked
  `draftTicketSummary` once, re-drafting the ticket summary from the full history (see
  [conversationFlow](../backend-services/conversationFlow.md)'s `updateDraftTicket`).
- `GET`/`PATCH /api/settings` read/write the `working_hours` flag; `PATCH` rejects a non-boolean
  without touching Supabase.
- `GET /api/conversations/queue` returns the queued-conversations list as-is.
- `GET /api/conversations/:id/messages` 404s when the conversation isn't found, otherwise returns
  `handoffStatus`/`estimatedWaitMinutes`/`draftTicket`/`messages` (including a `null` `draftTicket`
  before one's been drafted).
- `POST /api/conversations/:id/staff-join` 400s unless the conversation is currently `"queued"`;
  on success marks it `"live"`, calls the mocked `draftTicketSummary`, persists the result, and
  returns it plus the full transcript.
- `POST /api/conversations/:id/staff-message` rejects a blank message without touching Supabase,
  400s unless the conversation is currently `"live"`, and otherwise inserts and returns the
  `role: "staff"` message.
- `POST /api/conversations/:id/staff-create-ticket` 400s on an invalid category, an invalid
  `status`, and `status: "resolved"` without `resolution_notes` (no Supabase call in any of these);
  on valid input creates the ticket via the same shared path `createTicketForConversation` uses for
  the normal `create_ticket` tool call; with `status: "resolved"` and `resolution_notes` set, both
  land on the inserted row.
- `POST /api/conversations/:id/draft-resolution` returns the mocked `draftResolutionSummary`
  result as `{ resolution }`.

Uses `backend/src/test/supabaseMock.ts`'s chainable query-builder mock: each `await
supabase.from(...)` call in the code under test consumes the next result queued with
`queueResult()`, in call order — so each test's `queueResult` calls mirror the exact sequence of
Supabase calls the route handler (and, transitively, `conversationFlow`) makes.
