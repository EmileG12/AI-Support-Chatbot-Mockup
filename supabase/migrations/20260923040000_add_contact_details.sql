-- Upfront contact collection: name/email/phone are gathered and confirmed at the
-- start of a conversation, before any troubleshooting, so the support team can
-- follow up after the chat ends.

alter table conversations add column if not exists customer_name text;
alter table conversations add column if not exists customer_email text;
alter table conversations add column if not exists customer_phone text;
alter table conversations add column if not exists contact_confirmed boolean not null default false;

alter table tickets drop column if exists customer_contact;
alter table tickets add column if not exists customer_email text;
alter table tickets add column if not exists customer_phone text;
