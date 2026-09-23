# fetchTickets

`frontend/src/api.ts`

## Signature

```ts
interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
}

function fetchTickets(filters: TicketFilters): Promise<Ticket[]>
```

## Behavior

Builds a query string from whichever filters are set and `GET`s `${API_BASE_URL}/api/tickets?...`. Throws if the response is not OK. Returns the `tickets` array from the response. See [docs/api-routes/get-api-tickets.md](../api-routes/get-api-tickets.md).

## Used by

[docs/components/StaffDashboard.md](../components/StaffDashboard.md)
