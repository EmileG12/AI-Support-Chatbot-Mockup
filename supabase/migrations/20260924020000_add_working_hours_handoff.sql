-- Working-hours live handoff: when enabled, a confirmed-contact customer is
-- queued for a staff member instead of the AI continuing to handle their
-- issue. Adds queue/handoff state to conversations, a "staff" message role
-- for human replies, and a small settings table for the working-hours toggle.

alter table conversations add column if not exists handoff_status text not null default 'none';
alter table conversations add constraint conversations_handoff_status_check
  check (handoff_status in ('none', 'queued', 'live'));
alter table conversations add column if not exists estimated_wait_minutes integer;
alter table conversations add column if not exists queued_at timestamptz;
alter table conversations add column if not exists staff_joined_at timestamptz;

alter table messages drop constraint messages_role_check;
alter table messages add constraint messages_role_check check (role in ('user', 'assistant', 'staff'));

create table if not exists app_settings (
  key text primary key,
  value boolean not null
);
alter table app_settings enable row level security;

insert into app_settings (key, value) values ('working_hours', false)
  on conflict (key) do nothing;
