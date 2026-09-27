# login

`frontend/src/api.ts`

## Signature

```ts
function login(username: string, password: string): Promise<void>
```

## Behavior

`POST`s `${API_BASE_URL}/api/login` with `{ username, password }`. Throws (via the shared
`parseOrThrow` helper, reading the response body's `error` field) if the credentials are wrong — see
[docs/api-routes/post-login.md](../api-routes/post-login.md). On success, the backend has set the
session cookie; this function returns nothing further.

## Used by

[docs/components/LoginPage.md](../components/LoginPage.md)
