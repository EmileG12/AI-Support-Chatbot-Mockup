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
   (`broadband_fault`, `mobile_fault`, `landline_fault`, `billing`, `provisioning`, `account`,
   `complaint`, `other`), a priority (`low`/`medium`/`high`/`urgent`) and a short summary.
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

## Tests

Each package has its own Vitest suite (see [docs/tests/README.md](docs/tests/README.md)):

```
cd frontend && npm run test   # React Testing Library, mocks frontend/src/api.ts
cd backend && npm run test    # supertest against the Express app, mocks Supabase + the Anthropic SDK
```

## Not yet built

- Auth (both ends currently trust all requests — fine for a local mockup, not for production)
- RLS policies (currently default-deny; all access goes through the backend's service-role key)
