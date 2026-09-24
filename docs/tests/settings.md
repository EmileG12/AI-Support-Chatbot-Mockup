# settings.test.ts

`backend/src/settings.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests [settings](../backend-services/settings.md). Mocks `backend/src/supabaseClient.ts` via
`backend/src/test/supabaseMock.ts`.

## Covers

- `getWorkingHours` returns the stored `value`, and defaults to `false` when the row is missing.
- `setWorkingHours` updates the `working_hours` row via `.update({ value }).eq("key", "working_hours")`.
