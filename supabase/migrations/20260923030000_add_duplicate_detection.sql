-- Duplicate-ticket detection: trigram-match a new ticket's text against other
-- open tickets in the same category to flag probable repeat reports.

create extension if not exists pg_trgm;

alter table tickets add column if not exists possible_duplicate_of uuid references tickets(id);
alter table tickets add column if not exists duplicate_similarity numeric;

create index if not exists tickets_summary_trgm_idx on tickets using gin (summary gin_trgm_ops);

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
