# fetchLeads

`frontend/src/api.ts`

## Signature

```ts
interface LeadFilters {
  status?: string;
  category?: string;
}

function fetchLeads(filters: LeadFilters): Promise<Lead[]>
```

## Behavior

Builds a query string from whichever filters are set and `GET`s `${API_BASE_URL}/api/leads?...`. Throws if the response is not OK. Returns the `leads` array from the response. See [docs/api-routes/get-api-leads.md](../api-routes/get-api-leads.md).

## Used by

[docs/components/LeadsDashboard.md](../components/LeadsDashboard.md)
