# POST /api/conversations/:id/staff-join

`backend/src/app.ts`, delegating to [conversationFlow.staffJoinConversation](../backend-services/conversationFlow.md)

Staff clicked "Join" on a [QueuePanel](../components/QueuePanel.md) entry.

## Request

No body.

## Behavior

1. `400` unless the conversation's `handoff_status` is currently `"queued"`.
2. Sets `handoff_status: "live"` and `staff_joined_at`.
3. Calls [ticketAgent.draftTicketSummary](../backend-services/ticketAgent.md) against the
   transcript so far, to give the staff member an AI-drafted category/priority/summary to read -
   nothing is persisted as a ticket at this point.

## Response

```ts
{
  draftTicket: {
    category: TicketCategory;
    priority: TicketPriority;
    summary: string;
    raw_message: string;
    troubleshooting_notes?: string;
  } | null;
  messages: { id: string; role: "user" | "assistant" | "staff"; content: string }[];
}
```

`400` with `{ error: string }` if not queued, `500` on other failures.

## Related

- [docs/frontend-utils/staffJoin.md](../frontend-utils/staffJoin.md)
- [docs/api-routes/post-staff-message.md](post-staff-message.md), [docs/api-routes/post-staff-create-ticket.md](post-staff-create-ticket.md)
- [docs/db-schema/conversations.md](../db-schema/conversations.md)
