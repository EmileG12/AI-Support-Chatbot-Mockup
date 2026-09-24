# getSettings

`frontend/src/api.ts`

## Signature

```ts
function getSettings(): Promise<Settings>
```

## Behavior

`GET`s `${API_BASE_URL}/api/settings`. Throws (via `parseOrThrow`) on a non-OK response. Returns
`{ workingHours: boolean }` — see [docs/api-routes/get-api-settings.md](../api-routes/get-api-settings.md).

## Used by

[docs/components/StaffDashboard.md](../components/StaffDashboard.md) — loads the current toggle state on mount.
