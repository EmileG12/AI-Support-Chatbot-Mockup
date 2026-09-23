# updateTicket

`frontend/src/api.ts`

## Signature

```ts
function updateTicket(
  id: string,
  updates: Partial<Pick<Ticket, "category" | "priority" | "status">>
): Promise<Ticket>
```

## Behavior

`PATCH`es `${API_BASE_URL}/api/tickets/${id}` with whichever of `category`/`priority`/`status` are being changed. Throws if the response is not OK. Returns the updated `ticket`. See [docs/api-routes/patch-api-tickets-id.md](../api-routes/patch-api-tickets-id.md).

## Used by

[docs/components/StaffDashboard.md](../components/StaffDashboard.md) — called on every select-box change (category, priority, status), and by the "Close as duplicate" button (`status: "closed"`).
