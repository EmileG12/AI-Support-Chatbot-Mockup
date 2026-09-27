# POST /api/chat

`backend/src/app.ts`, delegating to [conversationFlow](../backend-services/conversationFlow.md)

## Request

```ts
{ conversationId?: string; message: string }
```

`400` if `message` is missing/blank. `conversationId` is expected to already exist by the time this
route is called in normal use — the frontend calls [POST /api/conversations](post-api-conversations.md)
first, the moment the customer picks a mode, and that's what sets `mode` on the row. If
`conversationId` is omitted, this route still creates one lazily with no `mode` set (defaulting to
`'support'` in the database) as a safety fallback - not exercised by the current frontend flow.

## Behavior

1. Creates a new `conversations` row if `conversationId` wasn't given (see note above).
2. Inserts the user's message into `messages` (`conversationFlow.insertUserMessage`).
3. Calls `conversationFlow.runAndPersistTurn(conversationId)`, which loads state (including `mode`)
   and branches:
   - `mode: "sales"` — delegates to the sales classifier/agent chain (see
     [salesAgent](../backend-services/salesAgent.md) and
     [conversationFlow](../backend-services/conversationFlow.md)'s `runSalesTurn`), persisting an
     assistant reply, a new lead, or a contact-confirmation prompt.
   - `mode: "support"` — runs one Claude turn (see [ticketAgent](../backend-services/ticketAgent.md))
     and persists whatever it produced — an assistant reply, a new ticket, or (before contact is
     confirmed) a deterministic contact-confirmation prompt — or, once the conversation is
     queued/live (see [conversationFlow](../backend-services/conversationFlow.md)), skips Claude
     entirely and just returns the empty reply the message was persisted against. Sales
     conversations never enter the queue/live handoff.

## Response

```ts
{
  conversationId: string;
  reply: string;
  ticket: Ticket | null;
  lead: Lead | null;
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

`ticket` is only ever set for `mode: "support"` conversations; `lead` only for `mode: "sales"` ones
- exactly one of the two is non-null when either the AI logs something.

When `pendingContact` is set, the frontend shows a Yes/Edit confirmation card instead of (or above)
the normal chat input — see [ContactConfirmCard](../components/ContactConfirmCard.md). Confirming
or correcting it goes through [POST /confirm-contact](post-confirm-contact.md) or
[PATCH /contact](patch-conversation-contact.md), not this route.

`handoffStatus`/`estimatedWaitMinutes` drive [App](../components/App.md)'s queued/live banner and
tell it when to start polling [GET /conversations/:id/messages](get-conversation-messages.md)
instead of expecting a synchronous reply. Always `"none"`/`null` for sales conversations.

`500` with `{ error: string }` on any failure.

## Related

- [docs/frontend-utils/sendChatMessage.md](../frontend-utils/sendChatMessage.md)
- [docs/api-routes/post-api-conversations.md](post-api-conversations.md) — sets `mode` before this route is ever called in normal use.
- [docs/db-schema/conversations.md](../db-schema/conversations.md), [docs/db-schema/messages.md](../db-schema/messages.md), [docs/db-schema/tickets.md](../db-schema/tickets.md), [docs/db-schema/leads.md](../db-schema/leads.md)
