# find_possible_duplicate_ticket

Defined in `supabase/migrations/20260923030000_add_duplicate_detection.sql`. Unmodified since.

## Purpose

Given a new ticket's category and text, find the single best-matching **other** open/in-progress ticket in the same category from the recent window, using Postgres trigram similarity (`pg_trgm`) rather than exact/substring matching — so near-duplicate phrasing of the same fault still matches.

## Current definition

```sql
create extension if not exists pg_trgm;

create index tickets_summary_trgm_idx on tickets using gin (summary gin_trgm_ops);

create or replace function find_possible_duplicate_ticket(
  p_category text,
  p_text text,
  p_window_hours int default 48,
  p_threshold real default 0.25
)
returns table(id uuid, summary text, similarity real)
language sql
stable
as $$
  select
    t.id,
    t.summary,
    similarity(t.raw_message || ' ' || t.summary, p_text) as similarity
  from tickets t
  where t.category = p_category
    and t.status in ('open', 'in_progress')
    and t.created_at > now() - (p_window_hours || ' hours')::interval
    and similarity(t.raw_message || ' ' || t.summary, p_text) > p_threshold
  order by similarity desc
  limit 1;
$$;
```

## Parameters

- `p_category` — must match one of `tickets.category`'s values exactly.
- `p_text` — the text to match against; callers pass `${raw_message} ${summary}` of the new ticket.
- `p_window_hours` (default 48) — how far back to look for candidate tickets.
- `p_threshold` (default 0.25) — minimum trigram similarity (0–1) to count as a match. Not exposed as a parameter by the backend wrapper (always uses the default).

## Caveats

- Matches within a category only — a landline fault and a broadband fault describing the same underlying outage won't match each other.
- No customer identity is used (there's no login), so this is a content-similarity signal only, not "same customer reported this twice." It's surfaced as a soft flag for staff to confirm, never used to silently merge or block a ticket.
- `tickets_summary_trgm_idx` indexes `summary` only; the similarity calculation itself also considers `raw_message`, so it isn't fully index-accelerated at the current (small) data volumes. Worth revisiting if the table grows large.

## Related

- [docs/backend-services/duplicates.md](../backend-services/duplicates.md) — the backend wrapper that calls this via `supabase.rpc(...)`.
- [docs/db-schema/tickets.md](../db-schema/tickets.md) — `possible_duplicate_of`/`duplicate_similarity` are where the result is stored.
