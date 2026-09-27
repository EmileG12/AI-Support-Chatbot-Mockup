# POST /api/logout

`backend/src/app.ts`, delegating to [auth.logout](../backend-services/auth.md)

Behind `requireAuth` like the rest of the app (logging out when not logged in just no-ops - the
cookie is absent either way).

## Request

No body.

## Behavior

Clears the `session` cookie (using the same options it was set with) and returns `{ ok: true }`.

## Response

`200 { ok: true }`

## Related

- [docs/frontend-utils/logout.md](../frontend-utils/logout.md)
- [docs/components/LogoutButton.md](../components/LogoutButton.md)
- [docs/api-routes/post-login.md](post-login.md)
