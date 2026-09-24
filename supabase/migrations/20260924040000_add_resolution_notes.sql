-- Resolution notes for a ticket closed out directly from a live handoff via
-- the "Issue resolved" flow: an AI-drafted (staff-reviewable) summary of how
-- the issue was actually resolved, stored alongside the ticket.

alter table tickets add column if not exists resolution_notes text;
