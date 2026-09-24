-- Stores the AI's latest drafted ticket summary for a live handoff, kept in
-- sync as the customer sends new messages (see conversationFlow.ts), so a
-- staff member's manual edits can be compared against it before an updated
-- AI suggestion is allowed to overwrite them.

alter table conversations add column if not exists draft_ticket jsonb;
