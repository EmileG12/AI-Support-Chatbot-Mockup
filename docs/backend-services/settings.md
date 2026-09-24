# settings

`backend/src/settings.ts`

## Purpose

Thin wrapper over the [app_settings](../db-schema/app_settings.md) table for the `working_hours`
flag.

## Exports

```ts
function getWorkingHours(): Promise<boolean>
function setWorkingHours(value: boolean): Promise<void>
```

`getWorkingHours` defaults to `false` if the row is somehow missing.

## Related

- [docs/api-routes/get-api-settings.md](../api-routes/get-api-settings.md), [docs/api-routes/patch-api-settings.md](../api-routes/patch-api-settings.md)
- [docs/backend-services/conversationFlow.md](conversationFlow.md) — `runAndPersistTurn` calls `getWorkingHours()` at the moment contact is confirmed, to decide whether to queue the customer.
