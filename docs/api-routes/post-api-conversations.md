# POST /api/conversations

`backend/src/app.ts`, delegating to [conversationFlow.createConversation](../backend-services/conversationFlow.md)

## Request

```ts
{ mode: "support" | "sales" }
```

`400` if `mode` is missing or isn't one of those two values.

## Behavior

Called the moment the customer picks "Customer Support" or "Customer Sales" on the [ModeSelectCard](../components/ModeSelectCard.md), before any chat message is sent. Inserts a `conversations` row with `mode` set upfront and returns its id. All subsequent turns for that conversation (`POST /api/chat`, the contact confirm/correct routes) read `mode` off this row to decide whether to run [ticketAgent](../backend-services/ticketAgent.md) or [salesAgent](../backend-services/salesAgent.md).

## Response

```ts
{ conversationId: string }
```

`500` with `{ error: string }` on any failure.

## Related

- [docs/frontend-utils/createConversation.md](../frontend-utils/createConversation.md)
- [docs/api-routes/post-api-chat.md](post-api-chat.md) — the route this conversation id is then used with.
- [docs/db-schema/conversations.md](../db-schema/conversations.md) — `mode`/`sales_category`.
