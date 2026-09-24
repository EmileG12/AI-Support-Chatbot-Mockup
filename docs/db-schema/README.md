# DB schema

Local Supabase (Postgres), migrations in `supabase/migrations/`. All tables have RLS enabled with no policies defined — see [docs/rls-policies/README.md](../rls-policies/README.md).

| Table | Purpose |
|---|---|
| [conversations](conversations.md) | One row per chat session |
| [messages](messages.md) | Every user/assistant/staff turn in a conversation |
| [tickets](tickets.md) | Logged support tickets, including AI classification and duplicate-detection results |
| [app_settings](app_settings.md) | Small key/value settings table (currently just the `working_hours` toggle) |
