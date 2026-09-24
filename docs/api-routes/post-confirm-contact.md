# POST /api/conversations/:id/confirm-contact

`backend/src/app.ts`, delegating to `conversationFlow.confirmPendingContact`

Customer clicked "Yes" on the [ContactConfirmCard](../components/ContactConfirmCard.md).

## Request

No body.

## Behavior

1. Loads the conversation's stored (unconfirmed) `customer_name`/`customer_email`/`customer_phone`/
   `customer_address`/`customer_postcode`/`customer_is_account_holder` and `contact_confirmed`.
   `400` if the conversation isn't found, or if contact is already confirmed, or if the stored
   details fail [validateContactDetails](../backend-services/contactValidation.md).
2. Marks `contact_confirmed = true`.
3. Inserts a synthetic `"Yes, that's correct."` **user** message (not an assistant one — see
   [conversationFlow](../backend-services/conversationFlow.md) for why that matters).
4. Calls `runAndPersistTurn` and returns its `reply`/`ticket` — a real Claude call, so if the
   customer already described their issue before confirming contact, this reply continues from it
   rather than asking "what can I help with" as if nothing was said.

## Response

```ts
{ reply: string; ticket: Ticket | null }
```

`400` with `{ error: string }` (conversation not found / already confirmed / invalid stored data),
`500` on other failures.

## Related

- [docs/frontend-utils/confirmContact.md](../frontend-utils/confirmContact.md)
- [docs/api-routes/patch-conversation-contact.md](patch-conversation-contact.md) — the "Edit" counterpart
- [docs/db-schema/conversations.md](../db-schema/conversations.md)
