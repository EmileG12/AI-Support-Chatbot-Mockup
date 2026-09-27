# conversations

Defined in `supabase/migrations/20260923000000_init_chat_tickets.sql`, then altered by
`20260923040000_add_contact_details.sql` (added `customer_name`, `customer_email`,
`customer_phone`, `contact_confirmed`), `20260924000000_add_address_and_account_holder.sql`
(added `customer_address`, `customer_postcode`, `customer_is_account_holder`),
`20260924020000_add_working_hours_handoff.sql` (added `handoff_status`,
`estimated_wait_minutes`, `queued_at`, `staff_joined_at`),
`20260924030000_add_draft_ticket.sql` (added `draft_ticket`),
`20260925000000_add_sales_mode.sql` (added `mode`, `sales_category`), and
`20260927000000_add_draft_lead.sql` (added `draft_lead`).

## Purpose

One row per chat session. `status` flips to `resolved` once a ticket or lead has been logged for it
([docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md)). Also holds the customer's
contact details, captured early in the conversation and confirmed before any troubleshooting or
sales follow-up — see [conversationFlow](../backend-services/conversationFlow.md). `mode` is set
once, upfront, when the customer picks "Customer Support" or "Customer Sales"
([docs/api-routes/post-api-conversations.md](../api-routes/post-api-conversations.md)) and never
changes afterward.

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
  staff_joined_at timestamptz,
  draft_ticket jsonb,
  mode text not null default 'support' check (mode in ('support', 'sales')),
  sales_category text check (sales_category in ('broadband', 'mobile')),
  draft_lead jsonb
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
  the AI continuing to troubleshoot (or, for sales, continuing to run the sales agent); flips to
  `'live'` once a staff member clicks "Join" in the dashboard. While `'queued'` or `'live'`,
  `runAndPersistTurn` never calls Claude conversationally — mode-agnostic, applies the same way to
  both `'support'` and `'sales'` conversations. See
  [conversationFlow](../backend-services/conversationFlow.md).
- `estimated_wait_minutes` — a `1`–`5` random value generated once, when transitioning to `'queued'`;
  shown to the customer and in the dashboard's queue panel.
- `queued_at` / `staff_joined_at` — timestamps for those two transitions; used to order the queue
  panel and could support a "time waited" display.
- `draft_ticket` — the AI's latest drafted `category`/`priority`/`summary`/`raw_message`/
  `troubleshooting_notes` (a `CreateTicketArgs`), for a staff member to read once live on a
  **support** conversation. Set when staff joins, then re-set every time the customer sends a new
  message while live (the AI re-reads the full transcript each time - see
  `conversationFlow.updateDraftTicket`). Never set from a staff message. Not a ticket - purely
  informational until staff calls `POST .../staff-create-ticket`. `null` for `mode: 'sales'`
  conversations (see `draft_lead` below).
- `mode` — `'support'` (default) or `'sales'`, set once by `createConversation` when the customer
  picks a mode, before any message is sent. Never changes afterward. Gates which agent module
  handles every turn ([ticketAgent](../backend-services/ticketAgent.md) vs.
  [salesAgent](../backend-services/salesAgent.md)) and which of `draft_ticket`/`draft_lead` gets set
  during a live handoff - both modes go through the same queue/live handoff otherwise.
- `sales_category` — `null` until [`runSalesClassifierTurn`](../backend-services/salesAgent.md)
  classifies the customer's first sales message as `'broadband'` or `'mobile'`; set once and reused
  for every later turn in that conversation. `null` for `mode: 'support'` conversations. Also needed
  to draft a lead during a live sales handoff, since `draftLeadSummary` picks its system prompt by
  category.
- `draft_lead` — the sales counterpart to `draft_ticket`: the AI's latest drafted
  `category`/`plan_interested`/`summary`/`raw_message` (a `CreateLeadArgs`), set/re-set the same way
  via `conversationFlow.updateDraftLead`, for a staff member to read once live on a **sales**
  conversation. `null` for `mode: 'support'` conversations, and for a sales conversation until
  `sales_category` is known.

## Related

- [docs/db-schema/messages.md](messages.md) — `messages.conversation_id` references this table.
- [docs/db-schema/tickets.md](tickets.md) — `tickets.conversation_id` references this table; contact fields are copied from here.
- [docs/db-schema/leads.md](leads.md) — the sales-mode counterpart to `tickets`, also copying contact fields from here.
- [docs/db-schema/app_settings.md](app_settings.md) — the `working_hours` flag that controls the queue transition.
- [docs/backend-services/conversationFlow.md](../backend-services/conversationFlow.md)
- [docs/api-routes/post-api-conversations.md](../api-routes/post-api-conversations.md) — where `mode` is first set.
- [docs/api-routes/post-confirm-contact.md](../api-routes/post-confirm-contact.md), [docs/api-routes/patch-conversation-contact.md](../api-routes/patch-conversation-contact.md)
- [docs/api-routes/post-staff-join.md](../api-routes/post-staff-join.md), [docs/api-routes/post-staff-message.md](../api-routes/post-staff-message.md)
