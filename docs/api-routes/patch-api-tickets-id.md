# PATCH /api/tickets/:id

`backend/src/app.ts`

## Request

```ts
{ category?: string; priority?: string; status?: string; duplicate_dismissed?: boolean }
```

Any subset of the four fields. `category`/`priority`/`status` are validated against `TICKET_CATEGORIES`/`TICKET_PRIORITIES`/`TICKET_STATUSES` (from [ticketAgent](../backend-services/ticketAgent.md)) — `400` with `{ error: "Invalid <field>: <value>" }` if not. `duplicate_dismissed` is validated as an actual boolean — `400` with `{ error: "duplicate_dismissed must be a boolean" }` if not. `400` with `{ error: "No valid fields to update" }` if the body is empty.

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
