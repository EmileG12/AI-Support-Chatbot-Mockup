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
  all editable before creating the ticket.
- Polls [getConversationMessages](../frontend-utils/getConversationMessages.md) every 2.5s and
  replaces `messages` with the result — the authoritative server copy, so it naturally picks up
  anything the customer sends.
- Sending a reply calls [sendStaffMessage](../frontend-utils/sendStaffMessage.md) and appends the
  returned message directly (no need to wait for the next poll, since the backend call already
  returns the persisted row with its real id).
- "Create ticket" calls [createTicketFromDraft](../frontend-utils/createTicketFromDraft.md) with
  the current (possibly edited) draft. On success, shows "Ticket #XXXXXXXX created.", disables
  further editing/replying, and calls `onTicketCreated` so
  [StaffDashboard](StaffDashboard.md) can refresh the ticket list.
- "Close" calls `onClose` — [StaffDashboard](StaffDashboard.md) owns actually unmounting this panel.
- Messages with `role: "staff"` are labeled "You" in the transcript.

## Related

- [docs/components/QueuePanel.md](QueuePanel.md), [docs/components/StaffDashboard.md](StaffDashboard.md), [docs/components/TicketCard.md](TicketCard.md) (`CATEGORY_LABELS`/`PRIORITY_LABELS`)
- [docs/api-routes/get-conversation-messages.md](../api-routes/get-conversation-messages.md), [docs/api-routes/post-staff-message.md](../api-routes/post-staff-message.md), [docs/api-routes/post-staff-create-ticket.md](../api-routes/post-staff-create-ticket.md)
