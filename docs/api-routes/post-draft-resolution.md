# POST /api/conversations/:id/draft-resolution

`backend/src/app.ts`, delegating to [conversationFlow.draftResolution](../backend-services/conversationFlow.md)

Staff clicked "Issue resolved" in the [StaffChatWindow](../components/StaffChatWindow.md).

## Request

No body.

## Behavior

Loads the full conversation history and calls
[ticketAgent.draftResolutionSummary](../backend-services/ticketAgent.md) to write a short
resolution summary from it - a plain-text Claude call, not a tool call, since there's no
structured data to extract. Purely a read: nothing is stored by this route. The result is only
ever persisted if staff accepts it (possibly after editing) via
[POST .../staff-create-ticket](post-staff-create-ticket.md) with `status: "resolved"`.

## Response

```ts
{ resolution: string | null }
```

`resolution` is `null` if the conversation has no history yet, or if Claude's response had no text
content. `500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/draftResolution.md](../frontend-utils/draftResolution.md)
- [docs/api-routes/post-staff-create-ticket.md](post-staff-create-ticket.md) — where the (possibly edited) result is accepted
- [docs/db-schema/tickets.md](../db-schema/tickets.md) — `resolution_notes`
