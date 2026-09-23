# GET /api/tickets

`backend/src/app.ts`

## Query params

All optional; `"all"` (or omitted) means no filter on that field.

- `status` — one of `open` / `in_progress` / `resolved` / `closed`
- `category` — one of the 8 `TicketCategory` values
- `priority` — one of `low` / `medium` / `high` / `urgent`

## Behavior

Queries `tickets`, applying `.eq()` for each filter present, ordered `created_at` descending.

## Response

```ts
{ tickets: Ticket[] }
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/fetchTickets.md](../frontend-utils/fetchTickets.md)
- [docs/db-schema/tickets.md](../db-schema/tickets.md)
