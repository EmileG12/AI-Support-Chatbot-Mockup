# Architecture

```
React chat UI (/)  --POST /api/conversations, POST /api/chat-->  Express backend  --Anthropic API (tool use)-->  Claude
React staff UI (/staff)  --GET/PATCH /api/tickets-->                    |
                                                                         v
                                          Supabase (local, Docker) — service role key
                                          conversations / messages / tickets / leads tables
```

## Components

- **Frontend** (`frontend/`, React + Vite + TypeScript): wired up with `react-router-dom` in `frontend/src/main.tsx`. `/login` renders [LoginPage](components/LoginPage.md) directly; every other route is nested under [AuthGate](components/AuthGate.md), a layout route that redirects to `/login` unless `GET /api/me` reports a valid session.
  - `/` — the customer-facing chat, plus (side by side) the staff-side working-hours queue/live-chat panel (`frontend/src/App.tsx`). Every conversation starts by picking a mode - "Customer Support" or "Customer Sales" - via [ModeSelectCard](components/ModeSelectCard.md); the two modes are otherwise separate agent chains sharing the same page and contact-collection UI. See [docs/components/App.md](components/App.md).
  - `/staff` — the internal ticket dashboard: list/filter/inspect/override tickets and duplicates (`frontend/src/StaffDashboard.tsx`). See [docs/components/StaffDashboard.md](components/StaffDashboard.md).
  - `/staff/sales` — the internal leads dashboard (`frontend/src/LeadsDashboard.tsx`).
  - The frontend never holds the Anthropic key or the Supabase service-role key — every data access goes through the backend. `frontend/src/api.ts`'s shared `apiFetch` wrapper sends `credentials: "include"` on every call, so the session cookie reaches the backend even though the two are on different origins in production.
- **Backend** (`backend/`, Node + Express + TypeScript): the only thing that holds `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the app's `APP_USERNAME`/`APP_PASSWORD`/`COOKIE_SECRET`. `backend/src/app.ts` builds and exports the Express app (all routes); `backend/src/server.ts` just imports it and calls `.listen()` — kept separate so tests can import the app without binding a real port. Every route except `POST /api/login`, `GET /api/me`, and `GET /api/health` sits behind a global `requireAuth` gate — see [auth](backend-services/auth.md). See [docs/api-routes/README.md](api-routes/README.md) for its routes and [docs/backend-services/README.md](backend-services/README.md) for its service modules.
- **Database**: Supabase (Postgres), run locally via the Supabase CLI (`supabase start`), which manages Docker itself. See [docs/db-schema/README.md](db-schema/README.md).

## Tests

Two Vitest suites (frontend, backend), each mocking their external boundary (the frontend's
`api.ts`; the backend's `supabaseClient.ts` and the Anthropic SDK) rather than hitting real
services. See [docs/tests/README.md](tests/README.md).

## Data flow: contact details, then a ticket (Customer Support mode)

1. The chat UI posts each customer message to `POST /api/chat`. Before any troubleshooting, the
   system prompt has Claude gather name/email/phone and call `collect_contact_details` — see
   [docs/backend-services/ticketAgent.md](backend-services/ticketAgent.md). Which tool Claude is
   even offered is gated on the conversation's `contact_confirmed` flag, not left to prompt
   compliance alone.
2. That tool call produces a deterministic (non-LLM) confirmation prompt, shown as a Yes/Edit card
   in the chat UI (see [docs/components/ContactConfirmCard.md](components/ContactConfirmCard.md)).
   Confirming or correcting it (`POST .../confirm-contact` / `PATCH .../contact`) settles the
   conversation's contact fields and makes one real Claude call to continue naturally — see
   [docs/backend-services/conversationFlow.md](backend-services/conversationFlow.md).
3. Once contact is confirmed, Claude troubleshoots and, when ready, calls `create_ticket`. The
   backend runs a duplicate check (trigram similarity against other open tickets in the same
   category — see [docs/rpc-functions/find_possible_duplicate_ticket.md](rpc-functions/find_possible_duplicate_ticket.md)) before inserting the new row into `tickets`, copying the confirmed contact fields from the conversation.
4. The ticket (with any duplicate flag) is returned to the chat UI, which shows a confirmation card, and is independently visible/editable in the staff dashboard at `/staff`.

## Data flow: Customer Sales mode

A separate top-level chat purpose alongside Customer Support, chosen upfront via
[ModeSelectCard](components/ModeSelectCard.md) and fixed on the conversation (`conversations.mode`)
for its whole lifetime - see [docs/db-schema/conversations.md](db-schema/conversations.md). The
frontend calls `POST /api/conversations` with the chosen mode *before* any chat message is sent,
unlike the support flow's lazy conversation creation.

1. A **classifier** turn (`runSalesClassifierTurn`) reads the customer's first sales message and
   decides broadband vs. mobile, or asks a clarifying question if it can't tell - see
   [docs/backend-services/salesAgent.md](backend-services/salesAgent.md). Once classified, the
   category is persisted (`conversations.sales_category`) and the conversation continues straight
   into step 2 in the same round-trip, so the customer's actual question gets answered immediately.
2. A **category-specific sales agent** (`runSalesAgentTurn`, its own system prompt built from Pop
   Telecom's real broadband/mobile catalog) answers product questions directly, and - once the
   customer shows buying intent - runs through the *exact same* `collect_contact_details` /
   confirm-or-edit flow as Customer Support (identical [ContactConfirmCard](components/ContactConfirmCard.md)/[ContactForm](components/ContactForm.md), same `POST .../confirm-contact` / `PATCH .../contact` routes).
3. Once contact is confirmed and [working hours are off](db-schema/app_settings.md), the sales agent
   calls `create_lead` instead of `create_ticket`, producing a `leads` row (see
   [docs/db-schema/leads.md](db-schema/leads.md)) - the sales-flow parallel to a support ticket,
   shown in the chat via [LeadCard](components/LeadCard.md) instead of [TicketCard](components/TicketCard.md).

If working hours are on, step 3 doesn't happen automatically - instead the conversation enters the
exact same working-hours queue/live handoff described below as a support conversation would, just
producing a drafted (then staff-created) lead instead of a ticket at the end. See "Data flow:
working-hours live handoff" below.

## Data flow: staff review

The dashboard is the human-in-the-loop check on the AI's classification: staff can list/filter tickets, open one to see its full transcript and diagnostics, override its category/priority/status, and close out flagged duplicates. See [docs/api-routes/README.md](api-routes/README.md) for the endpoints this uses.

## Data flow: working-hours live handoff

A global `working_hours` flag ([app_settings](db-schema/app_settings.md), toggled in [App](components/App.md)'s
own header, on `/`) changes what happens once a customer's contact is confirmed: instead of Claude
continuing to troubleshoot (support) or sell (sales), the conversation is queued
(`conversations.handoff_status`) with a randomized wait estimate, and the AI stops responding to it
entirely. This is mode-agnostic - a sales conversation queues and goes live exactly like a support
one, just producing a lead instead of a ticket at the end (see [conversationFlow](backend-services/conversationFlow.md)'s
`queueForHandoff`, shared by both). `App` also renders the staff-side
[QueuePanel](components/QueuePanel.md) (listing both support and sales entries, badged by mode) in
a panel next to the customer's own chat (not on `/staff`), so a single browser tab can show both
sides of the handoff at once for a demo.

A staff member joins a queued conversation from the queue panel (`POST .../staff-join`), which
marks it `live` and asks Claude for a one-off, non-conversational drafted summary - a ticket
(`ticketAgent.draftTicketSummary`) for a support conversation, a lead
(`salesAgent.draftLeadSummary`) for a sales one - so the staff member has context. `App` then
renders [StaffChatWindow](components/StaffChatWindow.md) or
[StaffLeadChatWindow](components/StaffLeadChatWindow.md) based on the joined conversation's `mode`.
From there, staff and customer message each other directly (`POST .../staff-message` on the staff
side, the existing `POST /api/chat` on the customer side — which, once queued/live, just persists
the message without invoking Claude at all, but *does* re-run the relevant draft function over the
full history so the drafted summary stays current as the customer says more — see
[conversationFlow.updateDraftTicket/updateDraftLead](backend-services/conversationFlow.md)) and both
sides **poll** `GET .../messages` rather than getting a synchronous reply, since neither side can
know when the other will speak next. Neither staff chat window lets a re-drafted field silently
overwrite one staff have already hand-edited - a conflicting update is held for staff to accept or
dismiss.

Staff can then turn the (edited) draft into a real record: `POST .../staff-create-ticket` for
support (reusing the exact same `createTicketForConversation` path the AI's own `create_ticket` tool
call uses - either as-is (ticket starts `open`), or, if staff clicks "Issue resolved" first (`POST
.../draft-resolution` asks Claude for a resolution summary from the *entire* transcript, including
staff's own replies, for review/editing), with `status: "resolved"` and that summary attached as
`resolution_notes`), or `POST .../staff-create-lead` for sales (reusing `createLeadForConversation`
- no resolution-flow equivalent, since leads have no "resolved" concept).

Deliberately **not** built on Supabase Realtime: that would need an anon-key client on the frontend
and a public-read RLS policy on `messages`, widening the security surface (see "Known gaps" below)
for what's ultimately a presentational feature. Plain polling through the already-authenticated
backend API avoids that trade-off entirely. See
[docs/backend-services/conversationFlow.md](backend-services/conversationFlow.md) for the full
state machine.

## Known gaps

- Authentication is a single shared account (`APP_USERNAME`/`APP_PASSWORD` env vars, no per-user identity, no password hashing) gating the whole app behind one session cookie — see [auth](backend-services/auth.md). Deliberately minimal for a public demo; would need real per-user accounts (and RLS policies scoped to them) before any production use.
- RLS is enabled on all tables but no policies are defined (default-deny) — every request currently goes through the backend's service-role key, which bypasses RLS entirely. See [docs/rls-policies/README.md](rls-policies/README.md).
- The leads dashboard (`/staff/sales`) supports listing/filtering/updating `category`/`status`, but has no equivalent of the ticket dashboard's duplicate-detection UI, since leads have no duplicate-detection at all (see [leads](db-schema/leads.md)).
