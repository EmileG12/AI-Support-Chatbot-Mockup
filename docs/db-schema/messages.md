# messages

Defined in `supabase/migrations/20260923000000_init_chat_tickets.sql`. Unmodified since.

## Purpose

Every user/assistant turn in a conversation, in order. Read back as history on each `/api/chat` call and shown as the transcript in the staff dashboard.

## Current DDL

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on messages(conversation_id);
```

RLS enabled, no policies (see [docs/rls-policies/README.md](../rls-policies/README.md)).

## Related

- [docs/db-schema/conversations.md](conversations.md)
- [docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md), [docs/api-routes/get-api-tickets-id.md](../api-routes/get-api-tickets-id.md)
