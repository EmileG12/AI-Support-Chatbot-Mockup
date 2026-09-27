# LoginPage.test.tsx

`frontend/src/LoginPage.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [LoginPage](../components/LoginPage.md). Mocks `frontend/src/api.ts`'s `login`, and renders
inside a `MemoryRouter` with real `/login`, `/`, and `/staff` routes to assert on where navigation
actually lands.

## Covers

- Submitting valid credentials calls `login(username, password)` and navigates to `/` by default.
- Submitting from a redirect that carried `location.state.from` (as [AuthGate](../components/AuthGate.md)
  sets it) navigates back to that original path instead of `/`.
- A rejected `login()` call shows its error message and leaves the form on screen instead of
  navigating.
