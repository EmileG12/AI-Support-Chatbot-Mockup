# leads

Defined in `supabase/migrations/20260925000000_add_sales_mode.sql`.

## Purpose

One row per logged sales lead: which plan category the customer was classified into (`category`),
the specific plan they settled on if any (`plan_interested`), what they're after (`summary`,
`raw_message`), the confirmed contact details copied from the parent conversation, and a lifecycle
`status`. The Customer Sales counterpart to [tickets](tickets.md) — created by
[conversationFlow.createLeadForConversation](../backend-services/conversationFlow.md), either
directly by a sales agent ([salesAgent](../backend-services/salesAgent.md)) calling `create_lead`
mid-conversation, or by staff via [POST .../staff-create-lead](../api-routes/post-staff-create-lead.md)
after a working-hours live handoff — exactly parallel to how a `tickets` row is created either way
on the support side.

## Current DDL

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  category text not null check (category in ('broadband', 'mobile')),
  plan_interested text,
  summary text not null,
  raw_message text not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_postcode text,
  customer_is_account_holder boolean,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);

create index leads_conversation_id_idx on leads (conversation_id);
```

RLS enabled, no policies (see [docs/rls-policies/README.md](../rls-policies/README.md)).

## Column notes

- `category` — the conversation's classified `sales_category` at the time the lead was logged; see [conversations.md](conversations.md).
- `plan_interested` — the specific plan name the customer settled on (e.g. "Full Fibre Broadband 220"), if the sales agent could tell one. `null` if the customer wants to proceed without having picked a specific plan yet.
- `customer_name`/`customer_email`/`customer_phone`/`customer_address`/`customer_postcode`/`customer_is_account_holder` — not part of the `create_lead` tool call; copied from the parent `conversations` row (already confirmed by this point, via the same `collect_contact_details` flow as support) when the lead is inserted.
- `status` — defaults to `'new'` on creation; staff can override it (along with `category`) via [PATCH /api/leads/:id](../api-routes/patch-api-leads-id.md) in [LeadsDashboard](../components/LeadsDashboard.md) — the `leads` counterpart to `tickets`' `PATCH /api/tickets/:id`.
- No duplicate-detection - `find_possible_duplicate_ticket` is ticket-specific and isn't run for leads.

## Related

- [docs/db-schema/conversations.md](conversations.md) — `leads.conversation_id` references this table; contact fields and `category` are sourced from here.
- [docs/db-schema/tickets.md](tickets.md) — the support-flow equivalent this mirrors.
- [docs/backend-services/salesAgent.md](../backend-services/salesAgent.md) — produces the `create_lead` tool call this table stores.
- [docs/backend-services/conversationFlow.md](../backend-services/conversationFlow.md) — `createLeadForConversation`.
- [docs/api-routes/post-staff-create-lead.md](../api-routes/post-staff-create-lead.md) — the staff-initiated way a row here gets created.
- [docs/components/LeadsDashboard.md](../components/LeadsDashboard.md), [docs/api-routes/get-api-leads.md](../api-routes/get-api-leads.md), [docs/api-routes/get-api-leads-id.md](../api-routes/get-api-leads-id.md), [docs/api-routes/patch-api-leads-id.md](../api-routes/patch-api-leads-id.md)
