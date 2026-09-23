# PATCH /api/conversations/:id/contact

`backend/src/app.ts`, delegating to `conversationFlow.overwriteContact`

Customer clicked "Edit" on the [ContactConfirmCard](../components/ContactConfirmCard.md) and
submitted the [ContactForm](../components/ContactForm.md).

## Request

```ts
{ name: string; email: string; phone: string }
```

## Behavior

1. Validates the body with [validateContactDetails](../backend-services/contactValidation.md).
   `400` with the specific validation error if it fails — nothing is written to Supabase.
2. Overwrites `customer_name`/`customer_email`/`customer_phone` on the conversation and marks
   `contact_confirmed = true`.
3. Inserts a synthetic **user** message: `"Actually, here are my correct details - Name: ...,
   Email: ..., Phone: ...."`.
4. Calls `runAndPersistTurn` and returns its `reply`/`ticket`, same as the confirm endpoint — one
   real Claude call, no separate re-confirmation round.

## Response

```ts
{ reply: string; ticket: Ticket | null }
```

`400` with `{ error: string }` on invalid input, `500` on other failures.

## Related

- [docs/frontend-utils/submitContact.md](../frontend-utils/submitContact.md)
- [docs/api-routes/post-confirm-contact.md](post-confirm-contact.md) — the "Yes" counterpart
- [docs/db-schema/conversations.md](../db-schema/conversations.md)
