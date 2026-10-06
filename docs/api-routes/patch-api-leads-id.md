# PATCH /api/leads/:id

`backend/src/app.ts`

## Request

```ts
{ category?: string; status?: string }
```

Any subset of the two fields. `category`/`status` are validated against `SALES_CATEGORIES`/`LEAD_STATUSES` — `400` with `{ error: "Invalid <field>: <value>" }` if not. `400` with `{ error: "No valid fields to update" }` if the body is empty.

## Behavior

Updates only the provided fields on the `leads` row matching `:id`.

## Response

```ts
{ lead: Lead } // the updated row
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/updateLead.md](../frontend-utils/updateLead.md) — this is how staff override the AI's classification.
- [docs/db-schema/leads.md](../db-schema/leads.md)
- [docs/api-routes/patch-api-tickets-id.md](patch-api-tickets-id.md) — the ticket counterpart
