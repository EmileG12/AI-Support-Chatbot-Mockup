# StaffChatWindow

`frontend/src/StaffChatWindow.tsx`

## Purpose

The panel a staff member sees after joining a queued conversation from [QueuePanel](QueuePanel.md):
an editable AI-drafted ticket summary, the live transcript, a reply box, and a "Create ticket"
action.

## Props

```ts
interface StaffChatWindowProps {
  conversationId: string;
  initialDraftTicket: DraftTicket | null;
  initialMessages: ChatMessage[];
  onClose: () => void;
  onTicketCreated: (ticket: Ticket) => void;
}
```

## Behavior

- Seeds `draft: DraftTicket` from `initialDraftTicket`, or a blank one (`category: "other"`,
  `priority: "medium"`, `raw_message` taken from the first `user` message) if the AI didn't manage
  to draft one. Category/priority `<select>`s and summary/troubleshooting-notes `<textarea>`s are
  all editable before creating the ticket. Also tracks `appliedAiDraft: DraftTicket | null`
  (seeded from `initialDraftTicket`) - the AI draft `draft` currently matches, used to tell "staff
  edited this" apart from "the AI's own suggestion moved on" - and `pendingAiDraft: DraftTicket |
  null`, a newer suggestion held back from applying.
- Polls [getConversationMessages](../frontend-utils/getConversationMessages.md) every 2.5s
  (immediately on mount, too) and replaces `messages` with the result — the authoritative server
  copy, so it naturally picks up anything the customer or a staff message on another tab sends.
  Stops polling once a ticket has been created.
- **Draft reconciliation** on each poll, when the polled `draftTicket` differs from
  `appliedAiDraft` (a genuinely new AI suggestion, field-by-field compared via `draftsEqual`):
  - If `draft` still equals `appliedAiDraft` (staff hasn't touched any field since the last AI
    draft): applies the new draft directly — `draft` and `appliedAiDraft` both become the new
    value. No prompt; nothing to lose.
  - Otherwise (staff has edited at least one field): the new suggestion is held in `pendingAiDraft`
    rather than applied, and an "AI suggests an update" card appears listing which fields would
    change, with **"Use AI update"** (applies `pendingAiDraft`, updates `appliedAiDraft`) and
    **"Keep my edits"** (dismisses it, but still advances `appliedAiDraft` to the new value so the
    same unchanged suggestion isn't re-offered on the next poll — the staff's edits are left alone
    either way). This is the whole point: an in-flight AI re-draft can never silently overwrite a
    manual correction.
  - `draft`/`appliedAiDraft` are read via refs inside the poll closure (not effect dependencies) so
    typing into the form doesn't restart the polling interval.
- Sending a reply calls [sendStaffMessage](../frontend-utils/sendStaffMessage.md) and appends the
  returned message directly (no need to wait for the next poll, since the backend call already
  returns the persisted row with its real id).
- "Create ticket" calls [createTicketFromDraft](../frontend-utils/createTicketFromDraft.md) with
  the current (possibly edited) draft. On success, shows "Ticket #XXXXXXXX created." and disables
  further editing/replying; calls `onTicketCreated` (a no-op in [App](App.md) — there's no ticket
  list on that page to refresh, the confirmation message here is enough).
- "Close" calls `onClose` — [App](App.md) owns actually unmounting this panel (back to
  [QueuePanel](QueuePanel.md)).
- Messages with `role: "staff"` are labeled "You" in the transcript.

## Related

- [docs/components/QueuePanel.md](QueuePanel.md), [docs/components/App.md](App.md), [docs/components/TicketCard.md](TicketCard.md) (`CATEGORY_LABELS`/`PRIORITY_LABELS`)
- [docs/api-routes/get-conversation-messages.md](../api-routes/get-conversation-messages.md), [docs/api-routes/post-staff-message.md](../api-routes/post-staff-message.md), [docs/api-routes/post-staff-create-ticket.md](../api-routes/post-staff-create-ticket.md)
