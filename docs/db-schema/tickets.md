# tickets

Defined in `supabase/migrations/20260923000000_init_chat_tickets.sql`, then altered by `20260923010000_add_landline_fault_category.sql` (added `landline_fault` to the category check), `20260923020000_add_troubleshooting_notes.sql` (added `troubleshooting_notes`), `20260923030000_add_duplicate_detection.sql` (added `possible_duplicate_of`, `duplicate_similarity`, and a trigram index), and `20260923040000_add_contact_details.sql` (dropped `customer_contact`; added `customer_email`, `customer_phone`).

## Purpose

One row per logged support ticket: the AI's classification (`category`, `priority`, `summary`), the confirmed contact details copied from the parent conversation (`customer_name`, `customer_email`, `customer_phone`), what the customer said (`raw_message`), troubleshooting diagnostics already covered, its lifecycle `status`, and any duplicate-ticket flag.

## Current DDL (combined, in current-shape order)

```sql
create table tickets (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  customer_name text,
  customer_email text,
  customer_phone text,
  category text not null check (category in (
    'broadband_fault', 'mobile_fault', 'landline_fault', 'billing', 'provisioning', 'account', 'complaint', 'other'
  )),
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  summary text not null,
  raw_message text not null,
  troubleshooting_notes text,
  possible_duplicate_of uuid references tickets(id),
  duplicate_similarity numeric
);

create index tickets_conversation_id_idx on tickets(conversation_id);
create index tickets_status_idx on tickets(status);
create index tickets_summary_trgm_idx on tickets using gin (summary gin_trgm_ops);
```

RLS enabled, no policies (see [docs/rls-policies/README.md](../rls-policies/README.md)).

## Column notes

- `category` — see [ticketAgent's `TICKET_CATEGORIES`](../backend-services/ticketAgent.md) for the authoritative list; the check constraint must be kept in sync with it by hand (they're not generated from a shared source).
- `customer_name`/`customer_email`/`customer_phone` — not part of the `create_ticket` tool call; copied from the parent `conversations` row (already confirmed by this point) when the ticket is inserted. See [conversationFlow](../backend-services/conversationFlow.md).
- `troubleshooting_notes` — populated for `broadband_fault`, `mobile_fault`, `landline_fault` only; see [ticketAgent](../backend-services/ticketAgent.md#system-prompt-structure) for what triggers it.
- `possible_duplicate_of` / `duplicate_similarity` — set via [find_possible_duplicate_ticket](../rpc-functions/find_possible_duplicate_ticket.md) at insert time; never updated afterward.

## Related

- [docs/db-schema/conversations.md](conversations.md)
- [docs/rpc-functions/find_possible_duplicate_ticket.md](../rpc-functions/find_possible_duplicate_ticket.md)
- [docs/api-routes/README.md](../api-routes/README.md)
- [docs/backend-services/conversationFlow.md](../backend-services/conversationFlow.md)
