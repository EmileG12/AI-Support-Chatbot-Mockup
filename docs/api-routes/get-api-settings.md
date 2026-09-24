# GET /api/settings

`backend/src/app.ts`, delegating to [settings.getWorkingHours](../backend-services/settings.md)

## Request

No body.

## Response

```ts
{ workingHours: boolean }
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/getSettings.md](../frontend-utils/getSettings.md)
- [docs/api-routes/patch-api-settings.md](patch-api-settings.md)
- [docs/db-schema/app_settings.md](../db-schema/app_settings.md)
