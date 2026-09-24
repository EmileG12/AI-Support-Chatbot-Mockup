# draftResolution

`frontend/src/api.ts`

## Signature

```ts
function draftResolution(conversationId: string): Promise<DraftResolutionResponse>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations/${conversationId}/draft-resolution` with no body.
Throws (via `parseOrThrow`) on a non-OK response. Returns `{ resolution: string | null }` — see
[docs/api-routes/post-draft-resolution.md](../api-routes/post-draft-resolution.md).

## Used by

[docs/components/StaffChatWindow.md](../components/StaffChatWindow.md) — "Issue resolved" button.
