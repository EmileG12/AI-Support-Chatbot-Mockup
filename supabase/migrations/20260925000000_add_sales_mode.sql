-- Customer Sales chat mode: conversations pick a purpose upfront ('support' or
-- 'sales'). Sales conversations classify into a broadband/mobile sub-agent and,
-- on buying intent, log a lead (parallel to a support ticket) instead of a ticket.

alter table conversations add column if not exists mode text not null default 'support';
alter table conversations add constraint conversations_mode_check check (mode in ('support', 'sales'));

alter table conversations add column if not exists sales_category text;
alter table conversations add constraint conversations_sales_category_check
  check (sales_category in ('broadband', 'mobile'));

create table if not exists leads (
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

create index if not exists leads_conversation_id_idx on leads (conversation_id);

alter table leads enable row level security;
