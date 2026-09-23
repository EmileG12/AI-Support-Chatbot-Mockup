# fetchTicketDetail

`frontend/src/api.ts`

## Signature

```ts
function fetchTicketDetail(id: string): Promise<TicketDetail>
```

## Behavior

`GET`s `${API_BASE_URL}/api/tickets/${id}`. Throws if the response is not OK. Returns `{ ticket, messages, duplicateOf }` — see [docs/api-routes/get-api-tickets-id.md](../api-routes/get-api-tickets-id.md).

## Used by

[docs/components/StaffDashboard.md](../components/StaffDashboard.md)
