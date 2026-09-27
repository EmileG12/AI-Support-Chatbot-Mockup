# auth

`backend/src/auth.ts`

## Purpose

Single-account login gate for the whole app: one hardcoded username/password checked against env
vars, backing a signed, `httpOnly` session cookie. No database table, no per-user accounts, no
password hashing — deliberately minimal for a public demo deployment.

## Exports

- `PUBLIC_PATHS: string[]` — `["/api/health", "/api/login", "/api/me"]`, the only paths exempt from
  the auth gate in `backend/src/app.ts`.
- `requireAuth(req, res, next)` — Express middleware. `401`s with `{ error: "Unauthorized" }` unless
  `req.signedCookies.session === "ok"`.
- `login(req, res)` — handler for `POST /api/login`. Compares `req.body.username`/`password` to
  `process.env.APP_USERNAME`/`APP_PASSWORD` (plain string equality). On match, sets the `session`
  cookie and returns `{ ok: true }`; on mismatch, `401` with `{ error: string }`.
- `logout(req, res)` — handler for `POST /api/logout`. Clears the `session` cookie and returns
  `{ ok: true }`.
- `me(req, res)` — handler for `GET /api/me`. Returns `{ authenticated: true }` if the session
  cookie is valid, else `401` with `{ authenticated: false }`. Used by the frontend's
  [AuthGate](../components/AuthGate.md) to check login state on page load.

## Cookie configuration

Signed (via `cookie-parser`, keyed off `COOKIE_SECRET`), `httpOnly`, 7-day `maxAge`. `secure`/
`sameSite` branch on `NODE_ENV`:
- Production: `secure: true`, `sameSite: "none"` — required because the frontend (Vercel/Netlify)
  and backend (Render/Railway) are different origins in production, and cross-site cookies require
  both.
- Otherwise: `secure: false`, `sameSite: "lax"` — `SameSite=None` requires HTTPS, which plain
  `http://localhost` doesn't have in some browsers, so local dev uses a laxer, non-HTTPS-safe
  configuration instead.

`logout` clears the cookie with the exact same options used to set it (browsers won't clear a
cookie whose attributes don't match).

## Related

- [docs/api-routes/post-login.md](../api-routes/post-login.md)
- [docs/api-routes/post-logout.md](../api-routes/post-logout.md)
- [docs/api-routes/get-me.md](../api-routes/get-me.md)
- [docs/components/AuthGate.md](../components/AuthGate.md)
- [docs/components/LoginPage.md](../components/LoginPage.md)
