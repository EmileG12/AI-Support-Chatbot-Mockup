# GET /api/leads

`backend/src/app.ts`

## Query params

All optional; `"all"` (or omitted) means no filter on that field.

- `status` — one of the `LeadStatus` values (`new` / `contacted` / `closed`)
- `category` — one of the `SalesCategory` values

## Behavior

Queries `leads`, applying `.eq()` for each filter present, ordered `created_at` descending.

## Response

```ts
{ leads: Lead[] }
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/fetchLeads.md](../frontend-utils/fetchLeads.md)
- [docs/db-schema/leads.md](../db-schema/leads.md)
- [docs/api-routes/get-api-tickets.md](get-api-tickets.md) — the ticket counterpart
