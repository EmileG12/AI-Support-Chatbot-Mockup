# AuthGate.test.tsx

`frontend/src/AuthGate.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [AuthGate](../components/AuthGate.md). Mocks `frontend/src/api.ts`'s `checkAuth`, and renders
inside a `MemoryRouter` with a protected route behind `AuthGate` plus a `/login` route, to assert on
which one actually renders.

## Covers

- When `checkAuth` resolves `true`, the protected route's content renders.
- When `checkAuth` resolves `false`, the user ends up on `/login` and the protected content never
  renders.
