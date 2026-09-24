# conversations

Defined in `supabase/migrations/20260923000000_init_chat_tickets.sql`, then altered by
`20260923040000_add_contact_details.sql` (added `customer_name`, `customer_email`,
`customer_phone`, `contact_confirmed`), `20260924000000_add_address_and_account_holder.sql`
(added `customer_address`, `customer_postcode`, `customer_is_account_holder`), and
`20260924020000_add_working_hours_handoff.sql` (added `handoff_status`,
`estimated_wait_minutes`, `queued_at`, `staff_joined_at`).

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
  customer_is_account_holder boolean,
  handoff_status text not null default 'none' check (handoff_status in ('none', 'queued', 'live')),
  estimated_wait_minutes integer,
  queued_at timestamptz,
  staff_joined_at timestamptz
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
- `handoff_status` — `'none'` normally (the AI handles the whole conversation). Flips to `'queued'`
  the moment contact is confirmed if the [working_hours setting](app_settings.md) is on, instead of
  the AI continuing to troubleshoot; flips to `'live'` once a staff member clicks "Join" in the
  dashboard. While `'queued'` or `'live'`, `runAndPersistTurn` never calls Claude — see
  [conversationFlow](../backend-services/conversationFlow.md).
- `estimated_wait_minutes` — a `1`–`5` random value generated once, when transitioning to `'queued'`;
  shown to the customer and in the dashboard's queue panel.
- `queued_at` / `staff_joined_at` — timestamps for those two transitions; used to order the queue
  panel and could support a "time waited" display.

## Related

- [docs/db-schema/messages.md](messages.md) — `messages.conversation_id` references this table.
- [docs/db-schema/tickets.md](tickets.md) — `tickets.conversation_id` references this table; contact fields are copied from here.
- [docs/db-schema/app_settings.md](app_settings.md) — the `working_hours` flag that controls the queue transition.
- [docs/backend-services/conversationFlow.md](../backend-services/conversationFlow.md)
- [docs/api-routes/post-confirm-contact.md](../api-routes/post-confirm-contact.md), [docs/api-routes/patch-conversation-contact.md](../api-routes/patch-conversation-contact.md)
- [docs/api-routes/post-staff-join.md](../api-routes/post-staff-join.md), [docs/api-routes/post-staff-message.md](../api-routes/post-staff-message.md)
