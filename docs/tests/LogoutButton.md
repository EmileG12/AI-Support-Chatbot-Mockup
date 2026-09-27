# LogoutButton.test.tsx

`frontend/src/LogoutButton.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [LogoutButton](../components/LogoutButton.md). Mocks `frontend/src/api.ts`'s `logout`, and
renders inside a `MemoryRouter` with a `/login` route to assert on where navigation lands.

## Covers

- Clicking the button calls `logout()` and navigates to `/login`.
