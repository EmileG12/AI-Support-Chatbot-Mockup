# POST /api/conversations/:id/staff-create-ticket

`backend/src/app.ts`, delegating to [conversationFlow.createTicketForConversation](../backend-services/conversationFlow.md)

Staff clicked "Create ticket" in the [StaffChatWindow](../components/StaffChatWindow.md), turning
the (possibly edited) AI-drafted summary into a real ticket.

## Request

```ts
{
  category: TicketCategory;
  priority: TicketPriority;
  summary: string;
  raw_message: string;
  troubleshooting_notes?: string;
}
```

`400` if `category`/`priority` aren't valid enum values, or `summary`/`raw_message` are
missing/blank — validated the same way as [PATCH /api/tickets/:id](patch-api-tickets-id.md).

## Behavior

Calls `createTicketForConversation` directly — the exact same insert/duplicate-check/mark-resolved
path the normal `create_ticket` tool call uses (see
[conversationFlow](../backend-services/conversationFlow.md)), just triggered by a staff action
instead of a Claude tool call.

## Response

```ts
{ ticket: Ticket }
```

`400` with `{ error: string }` on invalid input, `500` on other failures.

## Related

- [docs/frontend-utils/createTicketFromDraft.md](../frontend-utils/createTicketFromDraft.md)
- [docs/api-routes/post-staff-join.md](post-staff-join.md) — where the draft this is built from comes from
- [docs/db-schema/tickets.md](../db-schema/tickets.md)
