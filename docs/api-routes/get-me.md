# GET /api/me

`backend/src/app.ts`, delegating to [auth.me](../backend-services/auth.md)

Public route (not gated by `requireAuth`, since its whole job is to report auth state) — the check
[AuthGate](../components/AuthGate.md) calls on every protected page load.

## Request

No body.

## Behavior

Checks the signed `session` cookie the same way `requireAuth` does.

## Response

`200 { authenticated: true }` if logged in, `401 { authenticated: false }` otherwise.

## Related

- [docs/frontend-utils/checkAuth.md](../frontend-utils/checkAuth.md)
- [docs/components/AuthGate.md](../components/AuthGate.md)
