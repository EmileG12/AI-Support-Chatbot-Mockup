-- Chat agent schema: conversations, messages, tickets

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'resolved'))
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on messages(conversation_id);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  customer_name text,
  customer_contact text,
  category text not null check (category in (
    'broadband_fault', 'mobile_fault', 'billing', 'provisioning', 'account', 'complaint', 'other'
  )),
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  summary text not null,
  raw_message text not null
);

create index if not exists tickets_conversation_id_idx on tickets(conversation_id);
create index if not exists tickets_status_idx on tickets(status);

-- RLS: default-deny for now; all reads/writes go through the backend using
-- the service role key, which bypasses RLS. Revisit once the frontend needs
-- direct reads (e.g. a customer-facing ticket status page).
alter table conversations enable row level security;
alter table messages enable row level security;
alter table tickets enable row level security;
