# logout

`frontend/src/api.ts`

## Signature

```ts
function logout(): Promise<void>
```

## Behavior

`POST`s `${API_BASE_URL}/api/logout`, clearing the session cookie server-side — see
[docs/api-routes/post-logout.md](../api-routes/post-logout.md). Doesn't check the response status;
the caller navigates to `/login` regardless.

## Used by

[docs/components/LogoutButton.md](../components/LogoutButton.md)
