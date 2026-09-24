# conversations

Defined in `supabase/migrations/20260923000000_init_chat_tickets.sql`, then altered by
`20260923040000_add_contact_details.sql` (added `customer_name`, `customer_email`,
`customer_phone`, `contact_confirmed`) and `20260924000000_add_address_and_account_holder.sql`
(added `customer_address`, `customer_postcode`, `customer_is_account_holder`).

## Purpose

One row per chat session. `status` flips to `resolved` once a ticket has been logged for it
([docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md)). Also holds the customer's
contact details, captured early in the conversation and confirmed before any troubleshooting —
see [conversationFlow](../backend-services/conversationFlow.md).

## Current DDL (combined, in current-shape order)

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'resolved')),
  customer_name text,
  customer_email text,
  customer_phone text,
  contact_confirmed boolean not null default false,
  customer_address text,
  customer_postcode text,
  customer_is_account_holder boolean
);
```

RLS enabled, no policies (see [docs/rls-policies/README.md](../rls-policies/README.md)).

## Column notes

- `customer_name`/`customer_email`/`customer_phone`/`customer_address`/`customer_postcode`/
  `customer_is_account_holder` — set (unconfirmed) as soon as Claude's `collect_contact_details`
  tool call succeeds; overwritten if the customer corrects them via the edit form. Copied onto a
  `tickets` row at ticket-creation time.
- `contact_confirmed` — flips to `true` once the customer clicks "Yes" or submits a correction.
  Gates which tool Claude is offered on the next turn (see
  [ticketAgent](../backend-services/ticketAgent.md)) — `collect_contact_details` before, only
  `create_ticket` after.

## Related

- [docs/db-schema/messages.md](messages.md) — `messages.conversation_id` references this table.
- [docs/db-schema/tickets.md](tickets.md) — `tickets.conversation_id` references this table; contact fields are copied from here.
- [docs/backend-services/conversationFlow.md](../backend-services/conversationFlow.md)
- [docs/api-routes/post-confirm-contact.md](../api-routes/post-confirm-contact.md), [docs/api-routes/patch-conversation-contact.md](../api-routes/patch-conversation-contact.md)
