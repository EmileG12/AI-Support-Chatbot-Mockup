# supabaseClient

`backend/src/supabaseClient.ts`

## Purpose

The single Supabase client used throughout the backend, created with the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`), which bypasses RLS entirely. Never imported by the frontend.

## Behavior

- Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `process.env`; throws at import time if either is missing.
- `auth: { persistSession: false }` — this is a stateless backend client, not a browser session.

## Related

- [docs/rls-policies/README.md](../rls-policies/README.md) — why bypassing RLS is acceptable here for now.
