-- Captures what basic diagnostics (speed test, router light, master socket test,
-- router placement) were already covered in the chat, so the maintenance team
-- doesn't repeat them.
alter table tickets add column if not exists troubleshooting_notes text;
