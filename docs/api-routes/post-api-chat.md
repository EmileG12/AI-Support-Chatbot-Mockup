# POST /api/chat

`backend/src/app.ts`, delegating to [conversationFlow](../backend-services/conversationFlow.md)

## Request

```ts
{ conversationId?: string; message: string }
```

`400` if `message` is missing/blank.

## Behavior

1. Creates a new `conversations` row if `conversationId` wasn't given.
2. Inserts the user's message into `messages` (`conversationFlow.insertUserMessage`).
3. Calls `conversationFlow.runAndPersistTurn(conversationId)`, which loads state, and either runs
   one Claude turn (see [ticketAgent](../backend-services/ticketAgent.md)) and persists whatever it
   produced — an assistant reply, a new ticket, or (before contact is confirmed) a deterministic
   contact-confirmation prompt — or, once the conversation is queued/live (see
   [conversationFlow](../backend-services/conversationFlow.md)), skips Claude entirely and just
   returns the empty reply the message was persisted against.

## Response

```ts
{
  conversationId: string;
  reply: string;
  ticket: Ticket | null;
  pendingContact: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postcode: string;
    isAccountHolder: boolean;
  } | null;
  handoffStatus: "none" | "queued" | "live";
  estimatedWaitMinutes: number | null;
}
```

When `pendingContact` is set, the frontend shows a Yes/Edit confirmation card instead of (or above)
the normal chat input — see [ContactConfirmCard](../components/ContactConfirmCard.md). Confirming
or correcting it goes through [POST /confirm-contact](post-confirm-contact.md) or
[PATCH /contact](patch-conversation-contact.md), not this route.

`handoffStatus`/`estimatedWaitMinutes` drive [App](../components/App.md)'s queued/live banner and
tell it when to start polling [GET /conversations/:id/messages](get-conversation-messages.md)
instead of expecting a synchronous reply.

`500` with `{ error: string }` on any failure.

## Related

- [docs/frontend-utils/sendChatMessage.md](../frontend-utils/sendChatMessage.md)
- [docs/db-schema/conversations.md](../db-schema/conversations.md), [docs/db-schema/messages.md](../db-schema/messages.md), [docs/db-schema/tickets.md](../db-schema/tickets.md)
