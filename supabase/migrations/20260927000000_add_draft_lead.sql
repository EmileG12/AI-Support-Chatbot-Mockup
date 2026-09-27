-- Sales-mode counterpart to draft_ticket: stores the AI's latest drafted lead
-- summary for a live sales handoff, kept in sync as the customer sends new
-- messages (see conversationFlow.ts), the same way draft_ticket is for support.

alter table conversations add column if not exists draft_lead jsonb;
