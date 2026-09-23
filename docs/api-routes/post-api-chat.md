# POST /api/chat

`backend/src/app.ts`

## Request

```ts
{ conversationId?: string; message: string }
```

`400` if `message` is missing/blank.

## Behavior

1. Creates a new `conversations` row if `conversationId` wasn't given.
2. Inserts the user's message into `messages`.
3. Loads the full message history for the conversation (ascending by `created_at`) and passes it to `runAgentTurn` (see [docs/backend-services/ticketAgent.md](../backend-services/ticketAgent.md)).
4. If there's a reply, inserts it into `messages` as `role: "assistant"`.
5. If the agent returned a `ticket`:
   - Runs `findPossibleDuplicateTicket` (see [docs/backend-services/duplicates.md](../backend-services/duplicates.md)) against `${raw_message} ${summary}`.
   - Inserts the new row into `tickets`, including `possible_duplicate_of`/`duplicate_similarity` if a match was found.
   - Sets the conversation's `status` to `resolved`.

## Response

```ts
{
  conversationId: string;
  reply: string;
  ticket: Ticket | null; // full row as inserted, or null if no ticket was created this turn
}
```

`500` with `{ error: string }` on any failure (conversation/message/ticket insert, or the Claude call).

## Related

- [docs/frontend-utils/sendChatMessage.md](../frontend-utils/sendChatMessage.md)
- [docs/db-schema/conversations.md](../db-schema/conversations.md), [docs/db-schema/messages.md](../db-schema/messages.md), [docs/db-schema/tickets.md](../db-schema/tickets.md)
