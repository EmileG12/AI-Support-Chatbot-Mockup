# POST /api/conversations/:id/staff-create-ticket

`backend/src/app.ts`, delegating to [conversationFlow.createTicketForConversation](../backend-services/conversationFlow.md)

Staff clicked either "Create ticket" or "Accept & resolve ticket" in the
[StaffChatWindow](../components/StaffChatWindow.md), turning the (possibly edited) AI-drafted
summary — and, for a resolution, the AI-drafted resolution notes — into a real ticket.

## Request

```ts
{
  category: TicketCategory;
  priority: TicketPriority;
  summary: string;
  raw_message: string;
  troubleshooting_notes?: string;
  status?: TicketStatus;
  resolution_notes?: string;
}
```

`400` if `category`/`priority` aren't valid enum values, `summary`/`raw_message` are missing/blank
(validated the same way as [PATCH /api/tickets/:id](patch-api-tickets-id.md)), `status` is present
but not a valid `TicketStatus`, or `status` is `"resolved"` without a non-blank `resolution_notes`.

## Behavior

Calls `createTicketForConversation` directly — the exact same insert/duplicate-check/mark-the-*conversation*-resolved
path the normal `create_ticket` tool call uses (see
[conversationFlow](../backend-services/conversationFlow.md)), just triggered by a staff action
instead of a Claude tool call. Plain "Create ticket" omits `status`/`resolution_notes` (ticket
starts `open` as usual); "Issue resolved" sends `status: "resolved"` plus the reviewed
`resolution_notes` from [POST .../draft-resolution](post-draft-resolution.md).

## Response

```ts
{ ticket: Ticket }
```

`400` with `{ error: string }` on invalid input, `500` on other failures.

## Related

- [docs/frontend-utils/createTicketFromDraft.md](../frontend-utils/createTicketFromDraft.md), [docs/frontend-utils/resolveTicketFromDraft.md](../frontend-utils/resolveTicketFromDraft.md)
- [docs/api-routes/post-staff-join.md](post-staff-join.md) — where the draft this is built from comes from
- [docs/api-routes/post-draft-resolution.md](post-draft-resolution.md) — where `resolution_notes` is drafted
- [docs/db-schema/tickets.md](../db-schema/tickets.md)
