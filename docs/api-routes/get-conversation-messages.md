# GET /api/conversations/:id/messages

`backend/src/app.ts`, delegating to [conversationFlow.getConversationMessages](../backend-services/conversationFlow.md)

A polling endpoint - used by both the customer [App](../components/App.md) (while queued/live) and
the staff [StaffChatWindow](../components/StaffChatWindow.md), since neither can rely on a
synchronous reply once a conversation is out of the AI's hands.

## Request

No body.

## Response

```ts
{
  handoffStatus: "none" | "queued" | "live";
  estimatedWaitMinutes: number | null;
  messages: { id: string; role: "user" | "assistant" | "staff"; content: string }[];
}
```

`404` with `{ error: string }` if the conversation isn't found, `500` on other failures.

## Related

- [docs/frontend-utils/getConversationMessages.md](../frontend-utils/getConversationMessages.md)
- [docs/api-routes/post-staff-message.md](post-staff-message.md)
- [docs/db-schema/messages.md](../db-schema/messages.md)
