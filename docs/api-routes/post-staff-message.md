# POST /api/conversations/:id/staff-message

`backend/src/app.ts`, delegating to [conversationFlow.sendStaffMessage](../backend-services/conversationFlow.md)

A staff member's reply from the [StaffChatWindow](../components/StaffChatWindow.md).

## Request

```ts
{ message: string }
```

`400` if `message` is missing/blank.

## Behavior

Inserts a `role: "staff"` row into `messages`. `400` unless the conversation's `handoff_status` is
currently `"live"` — a staff member can only message a conversation they've joined.

## Response

```ts
{ message: { id: string; role: "staff"; content: string } }
```

`400` with `{ error: string }` if not live, `500` on other failures.

## Related

- [docs/frontend-utils/sendStaffMessage.md](../frontend-utils/sendStaffMessage.md)
- [docs/api-routes/get-conversation-messages.md](get-conversation-messages.md) — how the customer sees this reply
- [docs/db-schema/messages.md](../db-schema/messages.md)
