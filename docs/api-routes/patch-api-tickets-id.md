# PATCH /api/tickets/:id

`backend/src/app.ts`

## Request

```ts
{ category?: string; priority?: string; status?: string }
```

Any subset of the three fields. Each provided value is validated against `TICKET_CATEGORIES`/`TICKET_PRIORITIES`/`TICKET_STATUSES` (from [ticketAgent](../backend-services/ticketAgent.md)) — `400` with `{ error: "Invalid <field>: <value>" }` if not. `400` with `{ error: "No valid fields to update" }` if the body is empty.

## Behavior

Updates only the provided fields on the `tickets` row matching `:id`.

## Response

```ts
{ ticket: Ticket } // the updated row
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/updateTicket.md](../frontend-utils/updateTicket.md) — this is how staff override the AI's classification.
- [docs/db-schema/tickets.md](../db-schema/tickets.md)
