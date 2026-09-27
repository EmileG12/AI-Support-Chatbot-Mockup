# app.test.ts

`backend/src/app.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests the Express app exported from `backend/src/app.ts` (see [api-routes](../api-routes/README.md))
via `supertest`, so no real port is bound — this is also the only test coverage for
[conversationFlow](../backend-services/conversationFlow.md) and [auth](../backend-services/auth.md),
since both are exercised through the routes rather than unit-tested directly. Mocks
`backend/src/supabaseClient.ts` (via `backend/src/test/supabaseMock.ts`), `backend/src/duplicates.ts`,
`runAgentTurn`/`draftTicketSummary`/`draftResolutionSummary` from `backend/src/ticketAgent.ts`, and
`runSalesClassifierTurn`/`runSalesAgentTurn`/`draftLeadSummary` from `backend/src/salesAgent.ts` (keeping each
module's real exported constants via `importOriginal`, since `PATCH /api/tickets/:id` and
`POST /api/conversations/:id/staff-create-ticket` validate against `TICKET_CATEGORIES`/
`TICKET_PRIORITIES`/`TICKET_STATUSES`). `APP_USERNAME`/`APP_PASSWORD`/`COOKIE_SECRET` are set in
`backend/src/test/envSetup.ts` (a Vitest `setupFiles` entry, since `backend/src/app.ts` reads them
at module-load time — before a same-file `process.env.X = ...` line would run, given ES module
import hoisting). All requests other than the dedicated `auth` cases below go through a shared
`request.agent(app)` that logs in once in a top-level `beforeAll`, so its session cookie carries
across every test.

## Covers

- **`auth`**: an incorrect password `401`s; a protected route (`GET /api/tickets`) `401`s with no
  session cookie; `GET /api/health` succeeds with no cookie; a fresh agent that logs in can reach a
  protected route, and after `POST /api/logout` is `401`ed by that same route again.
- `POST /api/conversations` rejects an invalid `mode` without touching Supabase, and on a valid
  `mode` inserts a `conversations` row with it and returns the new id.
- `POST /api/chat` classifies then answers a sales conversation's first message in the same
  round-trip: persists the classified `sales_category` and calls the mocked `runSalesAgentTurn`
  with it, without ever calling `runAgentTurn`.
- `POST /api/chat` persists the classifier's clarifying question (and returns it as `reply`)
  without calling `runSalesAgentTurn` at all when the classifier can't tell broadband from mobile.
- `POST /api/chat` creates a `leads` row (returned as `lead`, with `ticket: null`) once a sales
  conversation's contact is confirmed and the mocked `runSalesAgentTurn` returns a lead.
- `POST /api/chat` transitions a confirmed-contact **sales** conversation to `handoff_status:
  "queued"` when working hours are on, exactly like support - without ever calling the mocked
  `runSalesAgentTurn`.
- `POST /api/chat` also gives an empty reply once a **sales** conversation is `"live"`, but *does*
  call the mocked `draftLeadSummary` once (with the conversation's classified category), re-drafting
  the lead summary instead of the ticket summary - never calls `runSalesAgentTurn`.
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
- `GET /api/conversations/queue` returns the queued-conversations list as-is, defaulting a `null`
  `mode` to `"support"` (mixed support/sales entries pass through unchanged).
- `GET /api/conversations/:id/messages` 404s when the conversation isn't found, otherwise returns
  `handoffStatus`/`estimatedWaitMinutes`/`draftTicket`/`draftLead`/`messages` (`null` for whichever
  draft hasn't been set yet - both cases covered, including a live sales conversation returning a
  non-null `draftLead` with `draftTicket: null`).
- `POST /api/conversations/:id/staff-join` 400s unless the conversation is currently `"queued"`;
  on success for a support conversation marks it `"live"`, calls the mocked `draftTicketSummary`,
  and returns `{ mode: "support", draftTicket, draftLead: null, messages }`; for a sales
  conversation with a classified category, calls the mocked `draftLeadSummary` instead and returns
  `{ mode: "sales", draftTicket: null, draftLead, messages }`.
- `POST /api/conversations/:id/staff-message` rejects a blank message without touching Supabase,
  400s unless the conversation is currently `"live"`, and otherwise inserts and returns the
  `role: "staff"` message.
- `POST /api/conversations/:id/staff-create-ticket` 400s on an invalid category, an invalid
  `status`, and `status: "resolved"` without `resolution_notes` (no Supabase call in any of these);
  on valid input creates the ticket via the same shared path `createTicketForConversation` uses for
  the normal `create_ticket` tool call; with `status: "resolved"` and `resolution_notes` set, both
  land on the inserted row.
- `POST /api/conversations/:id/staff-create-lead` 400s on an invalid category, a missing `summary`,
  and a missing `raw_message` (no Supabase call in any of these); on valid input creates the lead via
  the same shared path `createLeadForConversation` uses for the normal `create_lead` tool call.
- `POST /api/conversations/:id/draft-resolution` returns the mocked `draftResolutionSummary`
  result as `{ resolution }`.

Uses `backend/src/test/supabaseMock.ts`'s chainable query-builder mock: each `await
supabase.from(...)` call in the code under test consumes the next result queued with
`queueResult()`, in call order — so each test's `queueResult` calls mirror the exact sequence of
Supabase calls the route handler (and, transitively, `conversationFlow`) makes.
