# AuthGate

`frontend/src/AuthGate.tsx`

## Purpose

React Router layout route wrapping every protected route (`/`, `/staff`, `/staff/sales`) in
`frontend/src/main.tsx`, gating them behind login.

## Behavior

- On mount, calls [checkAuth](../frontend-utils/checkAuth.md) and stores the result as
  `"checking" | "authenticated" | "unauthenticated"`.
- While `"checking"`, renders nothing (avoids a flash of protected content before the check
  resolves).
- If `"unauthenticated"`, redirects to `/login` via `<Navigate>`, passing the current location as
  `state.from` so [LoginPage](LoginPage.md) can send the user back to where they were headed.
- If `"authenticated"`, renders `<Outlet />` (the matched child route).

## Related

- [docs/frontend-utils/checkAuth.md](../frontend-utils/checkAuth.md)
- [docs/components/LoginPage.md](LoginPage.md)
