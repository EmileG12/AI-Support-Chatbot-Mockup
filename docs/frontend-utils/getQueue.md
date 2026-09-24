# getQueue

`frontend/src/api.ts`

## Signature

```ts
function getQueue(): Promise<QueueEntry[]>
```

## Behavior

`GET`s `${API_BASE_URL}/api/conversations/queue`. Throws (via `parseOrThrow`) on a non-OK response,
otherwise returns the `queue` array from the body — see
[docs/api-routes/get-conversations-queue.md](../api-routes/get-conversations-queue.md).

## Used by

[docs/components/QueuePanel.md](../components/QueuePanel.md) — polled every 3s.
