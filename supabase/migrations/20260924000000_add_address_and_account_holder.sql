-- Extend contact collection with full address, postcode, and whether the
-- customer is the account holder (needed before the support team can discuss
-- account-specific details with them).

alter table conversations add column if not exists customer_address text;
alter table conversations add column if not exists customer_postcode text;
alter table conversations add column if not exists customer_is_account_holder boolean;

alter table tickets add column if not exists customer_address text;
alter table tickets add column if not exists customer_postcode text;
alter table tickets add column if not exists customer_is_account_holder boolean;
