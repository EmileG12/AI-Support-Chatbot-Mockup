-- Lets staff mark a flagged duplicate as a false positive without erasing the
-- original detection (possible_duplicate_of/duplicate_similarity stay as audit
-- history; this just suppresses the warning from being shown again).
alter table tickets add column if not exists duplicate_dismissed boolean not null default false;
