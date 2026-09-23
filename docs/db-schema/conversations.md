# conversations

Defined in `supabase/migrations/20260923000000_init_chat_tickets.sql`. Unmodified since.

## Purpose

One row per chat session. `status` flips to `resolved` once a ticket has been logged for it ([docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md)).

## Current DDL

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'resolved'))
);
```

RLS enabled, no policies (see [docs/rls-policies/README.md](../rls-policies/README.md)).

## Related

- [docs/db-schema/messages.md](messages.md) — `messages.conversation_id` references this table.
- [docs/db-schema/tickets.md](tickets.md) — `tickets.conversation_id` references this table.
