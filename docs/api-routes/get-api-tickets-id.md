# GET /api/tickets/:id

`backend/src/server.ts`

## Behavior

1. Loads the ticket row by id. `404` if not found.
2. Loads that ticket's conversation's messages (`id, role, content, created_at`, ascending by `created_at`) for the transcript.
3. If `possible_duplicate_of` is set, loads that other ticket's `id, summary`.

## Response

```ts
{
  ticket: Ticket;
  messages: { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
  duplicateOf: { id: string; summary: string } | null;
}
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/fetchTicketDetail.md](../frontend-utils/fetchTicketDetail.md)
- [docs/db-schema/tickets.md](../db-schema/tickets.md), [docs/db-schema/messages.md](../db-schema/messages.md)
