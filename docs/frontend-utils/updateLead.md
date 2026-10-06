# updateLead

`frontend/src/api.ts`

## Signature

```ts
function updateLead(
  id: string,
  updates: Partial<Pick<Lead, "category" | "status">>
): Promise<Lead>
```

## Behavior

`PATCH`es `${API_BASE_URL}/api/leads/${id}` with whichever of `category`/`status` are being changed. Throws if the response is not OK. Returns the updated `lead`. See [docs/api-routes/patch-api-leads-id.md](../api-routes/patch-api-leads-id.md).

## Used by

[docs/components/LeadsDashboard.md](../components/LeadsDashboard.md) — called on every select-box change (category, status).
