# POST /api/conversations/:id/staff-join

`backend/src/app.ts`, delegating to [conversationFlow.staffJoinConversation](../backend-services/conversationFlow.md)

Staff clicked "Join" on a [QueuePanel](../components/QueuePanel.md) entry.

## Request

No body.

## Behavior

1. `400` unless the conversation's `handoff_status` is currently `"queued"`. Also reads `mode` and
   `sales_category`.
2. Sets `handoff_status: "live"` and `staff_joined_at`.
3. For a support conversation, calls [ticketAgent.draftTicketSummary](../backend-services/ticketAgent.md)
   against the transcript so far to give the staff member an AI-drafted category/priority/summary to
   read. For a sales conversation with a classified category, calls
   [salesAgent.draftLeadSummary](../backend-services/salesAgent.md) instead, producing a drafted
   category/plan/summary. Either way, nothing is persisted as a real ticket/lead at this point.

## Response

```ts
{
  mode: "support" | "sales";
  draftTicket: {
    category: TicketCategory;
    priority: TicketPriority;
    summary: string;
    raw_message: string;
    troubleshooting_notes?: string;
  } | null;
  draftLead: {
    category: "broadband" | "mobile";
    plan_interested?: string;
    summary: string;
    raw_message: string;
  } | null;
  messages: { id: string; role: "user" | "assistant" | "staff"; content: string }[];
}
```

Exactly one of `draftTicket`/`draftLead` is non-null, matching `mode` - the frontend
([App](../components/App.md)) uses `mode` to pick between
[StaffChatWindow](../components/StaffChatWindow.md) and
[StaffLeadChatWindow](../components/StaffLeadChatWindow.md). `400` with `{ error: string }` if not
queued, `500` on other failures.

## Related

- [docs/frontend-utils/staffJoin.md](../frontend-utils/staffJoin.md)
- [docs/api-routes/post-staff-message.md](post-staff-message.md), [docs/api-routes/post-staff-create-ticket.md](post-staff-create-ticket.md), [docs/api-routes/post-staff-create-lead.md](post-staff-create-lead.md)
- [docs/db-schema/conversations.md](../db-schema/conversations.md)
