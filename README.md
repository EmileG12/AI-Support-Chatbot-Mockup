# Fenmoor Telecom Mockup

A mockup ISP chatbot: customers describe their issue in chat, Claude classifies it and logs a
support ticket via a `create_ticket` tool call, backed by a local Supabase (Postgres) instance.

## Stack

- **Frontend**: React + Vite + TypeScript (`/frontend`)
- **Backend**: Node + Express + TypeScript (`/backend`) — holds the Anthropic and Supabase
  service-role keys; the frontend never sees them.
- **Database**: Supabase, run locally via the Supabase CLI (Docker under the hood)

## Running it locally

### 1. Start Supabase

```
npx supabase start
```

This starts Postgres + Studio in Docker and applies the migration in `supabase/migrations/`.
Note the `API_URL` and `SERVICE_ROLE_KEY` it prints — this project's local ports are shifted
by +10 from the Supabase CLI defaults (API `54331`, DB `54332`, Studio `54333`, Mailpit
`54334`) to avoid clashing with other local Supabase projects on this machine; see
`supabase/config.toml` if you need to change them further.

Studio (to browse the `tickets` table) is at `http://127.0.0.1:54333`.

### 2. Start the backend

```
cd backend
cp .env.example .env   # then fill in ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Runs on `http://localhost:3001`.

### 3. Start the frontend

```
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## How it works

1. The React chat UI posts each customer message to `POST /api/chat` on the backend.
2. The backend loads the conversation history from Supabase and sends it to Claude
   (`claude-sonnet-4-5`) along with a `create_ticket` tool definition and a system prompt
   describing the Fenmoor Telecom support agent persona.
3. Claude either asks a clarifying question or calls `create_ticket` with a category
   (`broadband_fault`, `mobile_fault`, `landline_fault`, `voip_fault`, `billing`, `provisioning`,
   `account`, `complaint`, `other`), a priority (`low`/`medium`/`high`/`urgent`) and a short summary.
2. When a ticket is created, the backend inserts it into the `tickets` table and the frontend
   shows a confirmation card inline in the chat.
4. Before inserting, the backend also checks for a likely duplicate: a Postgres function
   (`find_possible_duplicate_ticket`, using the `pg_trgm` extension) trigram-matches the new
   ticket's text against other open tickets in the same category from the last 48 hours. A match
   above the similarity threshold is recorded on the ticket (`possible_duplicate_of`,
   `duplicate_similarity`) and surfaced to the customer as a soft note, with full detail shown to
   staff.

## Staff dashboard

`http://localhost:5173/staff` (linked from the chat page) lists tickets with status/category/
priority filters. Selecting a ticket shows its full chat transcript, troubleshooting notes, and
(if flagged) a duplicate banner linking to the original ticket with a "close as duplicate" action.
Category, priority and status can all be overridden here — this is the human-in-the-loop check on
the AI's classification before a ticket is actioned.

## Working-hours live handoff

A "Working hours" toggle sits right in the customer chat page's header (`/`), alongside a staff-side
panel next to the chat itself — so both sides of the handoff can be presented side by side on one
screen, rather than needing a second tab for `/staff`. It switches the chatbot from fully autonomous
to a queue-and-handoff model, closer to how a real support desk runs:

1. With it **on**, once a customer's contact details are confirmed they're queued instead of the
   AI continuing to troubleshoot — a canned message gives a randomized 1–5 minute wait estimate,
   and further messages just wait in the transcript.
2. The staff-side panel's queue list shows waiting customers; clicking "Join" opens a live two-way
   chat with the customer right there, alongside an AI-drafted ticket summary (category/priority/
   summary/diagnostics) read off the transcript for context. That summary keeps itself current as
   the customer sends more messages — though never by silently overwriting a field staff have
   already hand-corrected; a conflicting update is held for staff to accept or dismiss instead.
3. Staff can edit that draft and turn it into a real ticket, closing out the chat — reusing the
   exact same ticket-creation path (duplicate check included) the AI's own `create_ticket` calls use.
4. Or, once the issue is actually sorted, staff can click **"Issue resolved"** instead: the AI reads
   the *entire* conversation (including the staff's own replies) and drafts a resolution summary for
   staff to review, edit if needed, and accept — creating the ticket already `resolved`, with that
   summary attached as its resolution notes.

With the toggle **off** (the default), behavior is unchanged: the AI handles the whole conversation
end-to-end as described above. See [docs/backend-services/conversationFlow.md](docs/backend-services/conversationFlow.md)
for the full state machine.

## Tests

Each package has its own Vitest suite (see [docs/tests/README.md](docs/tests/README.md)):

```
cd frontend && npm run test   # React Testing Library, mocks frontend/src/api.ts
cd backend && npm run test    # supertest against the Express app, mocks Supabase + the Anthropic SDK
```

## Not yet built

- Auth (both ends currently trust all requests — fine for a local mockup, not for production)
- RLS policies (currently default-deny; all access goes through the backend's service-role key)
