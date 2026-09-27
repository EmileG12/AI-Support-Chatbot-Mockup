# POST /api/login

`backend/src/app.ts`, delegating to [auth.login](../backend-services/auth.md)

Public route (not gated by `requireAuth`) — the entry point for the app's single-account login.

## Request

```ts
{ username: string; password: string }
```

## Behavior

Compares the body against `process.env.APP_USERNAME`/`APP_PASSWORD` with plain string equality. On
a match, sets a signed, `httpOnly` `session` cookie (see [auth](../backend-services/auth.md) for
its exact options) and returns `{ ok: true }`. On a mismatch, `401` with
`{ error: "Invalid username or password" }`.

## Response

`200 { ok: true }` on success, `401 { error: string }` on invalid credentials.

## Related

- [docs/frontend-utils/login.md](../frontend-utils/login.md)
- [docs/components/LoginPage.md](../components/LoginPage.md)
- [docs/api-routes/post-logout.md](post-logout.md)
- [docs/api-routes/get-me.md](get-me.md)
