# fetchLeadDetail

`frontend/src/api.ts`

## Signature

```ts
function fetchLeadDetail(id: string): Promise<LeadDetail>
```

## Behavior

`GET`s `${API_BASE_URL}/api/leads/${id}`. Throws if the response is not OK. Returns `{ lead, messages }` — see [docs/api-routes/get-api-leads-id.md](../api-routes/get-api-leads-id.md).

## Used by

[docs/components/LeadsDashboard.md](../components/LeadsDashboard.md)
