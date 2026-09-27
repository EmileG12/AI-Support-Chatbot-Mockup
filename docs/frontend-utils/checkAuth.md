# checkAuth

`frontend/src/api.ts`

## Signature

```ts
function checkAuth(): Promise<boolean>
```

## Behavior

`GET`s `${API_BASE_URL}/api/me` and returns whether the response was OK (`true` if a valid session
cookie is present, `false` on a `401`) — see [docs/api-routes/get-me.md](../api-routes/get-me.md).
Unlike the other `api.ts` functions, never throws on a non-OK response; a `401` is an expected,
meaningful result here, not an error.

## Used by

[docs/components/AuthGate.md](../components/AuthGate.md)
