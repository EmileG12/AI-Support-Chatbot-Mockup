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
- **Backend** (`backend/`, Node + Express + TypeScript): the only thing that holds `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. See [docs/api-routes/README.md](api-routes/README.md) for its routes and [docs/backend-services/README.md](backend-services/README.md) for its service modules.
- **Database**: Supabase (Postgres), run locally via the Supabase CLI (`supabase start`), which manages Docker itself. See [docs/db-schema/README.md](db-schema/README.md).

## Data flow: logging a ticket

1. The chat UI posts each customer message to `POST /api/chat`.
2. The backend loads the conversation's message history from `messages`, sends it to Claude along with a `create_ticket` tool definition and a system prompt (see [docs/backend-services/ticketAgent.md](backend-services/ticketAgent.md)).
3. If Claude calls `create_ticket`, the backend runs a duplicate check (trigram similarity against other open tickets in the same category — see [docs/rpc-functions/find_possible_duplicate_ticket.md](rpc-functions/find_possible_duplicate_ticket.md)) before inserting the new row into `tickets`.
4. The ticket (with any duplicate flag) is returned to the chat UI, which shows a confirmation card, and is independently visible/editable in the staff dashboard at `/staff`.

## Data flow: staff review

The dashboard is the human-in-the-loop check on the AI's classification: staff can list/filter tickets, open one to see its full transcript and diagnostics, override its category/priority/status, and close out flagged duplicates. See [docs/api-routes/README.md](api-routes/README.md) for the endpoints this uses.

## Known gaps

- No authentication on either the chat or the staff dashboard — anyone who can reach the backend can read/write any ticket. Fine for a local mockup; would need auth (and RLS policies scoped to it) before any real deployment.
- RLS is enabled on all three tables but no policies are defined (default-deny) — every request currently goes through the backend's service-role key, which bypasses RLS entirely. See [docs/rls-policies/README.md](rls-policies/README.md).
