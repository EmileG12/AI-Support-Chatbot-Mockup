# updateSettings

`frontend/src/api.ts`

## Signature

```ts
function updateSettings(settings: Settings): Promise<Settings>
```

## Behavior

`PATCH`es `${API_BASE_URL}/api/settings` with `{ workingHours }`. Throws (via `parseOrThrow`) on a
non-OK response. See [docs/api-routes/patch-api-settings.md](../api-routes/patch-api-settings.md).

## Used by

[docs/components/App.md](../components/App.md) — the "Working hours" toggle.
