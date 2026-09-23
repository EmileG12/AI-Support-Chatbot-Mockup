# Architecture

```
React chat UI (/)  --POST /api/chat-->  Express backend  --Anthropic API (tool use)-->  Claude
React staff UI (/staff)  --GET/PATCH /api/tickets-->        |
                                                             v
                                          Supabase (local, Docker) — service role key
                                          conversations / messages / tickets tables
```

## Components

- **Frontend** (`frontend/`, React + Vite + TypeScript): two pages, wired up with `react-router-dom` in `frontend/src/main.tsx`.
  - `/` — the customer-facing chat (`frontend/src/App.tsx`). See [docs/components/App.md](components/App.md).
  - `/staff` — the internal ticket dashboard (`frontend/src/StaffDashboard.tsx`). See [docs/components/StaffDashboard.md](components/StaffDashboard.md).
  - The frontend never holds the Anthropic key or the Supabase service-role key — every data access goes through the backend.
- **Backend** (`backend/`, Node + Express + TypeScript): the only thing that holds `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. `backend/src/app.ts` builds and exports the Express app (all routes); `backend/src/server.ts` just imports it and calls `.listen()` — kept separate so tests can import the app without binding a real port. See [docs/api-routes/README.md](api-routes/README.md) for its routes and [docs/backend-services/README.md](backend-services/README.md) for its service modules.
- **Database**: Supabase (Postgres), run locally via the Supabase CLI (`supabase start`), which manages Docker itself. See [docs/db-schema/README.md](db-schema/README.md).

## Tests

Two Vitest suites (frontend, backend), each mocking their external boundary (the frontend's
`api.ts`; the backend's `supabaseClient.ts` and the Anthropic SDK) rather than hitting real
services. See [docs/tests/README.md](tests/README.md).

## Data flow: contact details, then a ticket

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

## Data flow: staff review

The dashboard is the human-in-the-loop check on the AI's classification: staff can list/filter tickets, open one to see its full transcript and diagnostics, override its category/priority/status, and close out flagged duplicates. See [docs/api-routes/README.md](api-routes/README.md) for the endpoints this uses.

## Known gaps

- No authentication on either the chat or the staff dashboard — anyone who can reach the backend can read/write any ticket. Fine for a local mockup; would need auth (and RLS policies scoped to it) before any real deployment.
- RLS is enabled on all three tables but no policies are defined (default-deny) — every request currently goes through the backend's service-role key, which bypasses RLS entirely. See [docs/rls-policies/README.md](rls-policies/README.md).
