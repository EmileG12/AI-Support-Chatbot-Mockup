# PATCH /api/settings

`backend/src/app.ts`, delegating to [settings.setWorkingHours](../backend-services/settings.md)

Toggled from the [StaffDashboard](../components/StaffDashboard.md) header.

## Request

```ts
{ workingHours: boolean }
```

`400` if `workingHours` isn't an actual boolean — nothing is written to Supabase.

## Response

```ts
{ workingHours: boolean }
```

`500` with `{ error: string }` on failure.

## Related

- [docs/frontend-utils/updateSettings.md](../frontend-utils/updateSettings.md)
- [docs/api-routes/get-api-settings.md](get-api-settings.md)
- [docs/db-schema/app_settings.md](../db-schema/app_settings.md)
