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
    mode: "support" | "sales";
    customer_name: string | null;
    queued_at: string | null;
    estimated_wait_minutes: number | null;
  }[];
}
```

Conversations with `handoff_status: "queued"`, ordered oldest-queued-first - support and sales
conversations mixed together in one queue, distinguished by `mode` (defaults to `"support"` if the
column is somehow null). [QueuePanel](../components/QueuePanel.md) badges each entry by `mode`.
`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/getQueue.md](../frontend-utils/getQueue.md)
- [docs/api-routes/post-staff-join.md](post-staff-join.md)
- [docs/db-schema/conversations.md](../db-schema/conversations.md)
