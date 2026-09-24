# GET /api/conversations/queue

`backend/src/app.ts`, delegating to [conversationFlow.listQueuedConversations](../backend-services/conversationFlow.md)

Backs the [QueuePanel](../components/QueuePanel.md)'s list of customers waiting for a staff
member.

## Request

No body.

## Response

```ts
{
  queue: {
    id: string;
    customer_name: string | null;
    queued_at: string | null;
    estimated_wait_minutes: number | null;
  }[];
}
```

Conversations with `handoff_status: "queued"`, ordered oldest-queued-first. `500` with
`{ error: string }` on failure.

## Related

- [docs/frontend-utils/getQueue.md](../frontend-utils/getQueue.md)
- [docs/api-routes/post-staff-join.md](post-staff-join.md)
- [docs/db-schema/conversations.md](../db-schema/conversations.md)
