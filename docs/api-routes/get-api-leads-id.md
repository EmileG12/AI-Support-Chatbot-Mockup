# GET /api/leads/:id

`backend/src/app.ts`

## Behavior

1. Loads the lead row by id. `404` if not found.
2. Loads that lead's conversation's messages (`id, role, content, created_at`, ascending by `created_at`) for the transcript.

No duplicate-link lookup — leads have no duplicate detection (unlike tickets).

## Response

```ts
{
  lead: Lead;
  messages: { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
}
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/fetchLeadDetail.md](../frontend-utils/fetchLeadDetail.md)
- [docs/db-schema/leads.md](../db-schema/leads.md), [docs/db-schema/messages.md](../db-schema/messages.md)
- [docs/api-routes/get-api-tickets-id.md](get-api-tickets-id.md) — the ticket counterpart
