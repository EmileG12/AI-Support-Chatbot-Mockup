# RLS policies

No policies are currently defined on any table. `conversations`, `messages`, and `tickets` all have `alter table ... enable row level security;` (in `supabase/migrations/20260923000000_init_chat_tickets.sql`) with **no** accompanying `create policy` statements — the effective behavior is default-deny for any client using the `anon`/`authenticated` roles.

This is safe today only because every request goes through the backend's Supabase client, which uses the **service-role key** ([docs/backend-services/supabaseClient.md](../backend-services/supabaseClient.md)) and bypasses RLS entirely. Neither the chat page nor the staff dashboard talk to Supabase directly.

## When this needs to change

If the frontend ever queries Supabase directly (e.g. a customer-facing "check my ticket status" page using the anon key), real policies need to be added here — most obviously scoping `tickets`/`messages` reads to rows matching an authenticated customer's own conversations, and scoping dashboard writes to authenticated staff only. See [docs/architecture.md#known-gaps](../architecture.md).
