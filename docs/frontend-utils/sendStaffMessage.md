# sendStaffMessage

`frontend/src/api.ts`

## Signature

```ts
function sendStaffMessage(conversationId: string, message: string): Promise<ChatMessage>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations/${conversationId}/staff-message` with `{ message }`.
Throws (via `parseOrThrow`) on a non-OK response. Returns the inserted message — see
[docs/api-routes/post-staff-message.md](../api-routes/post-staff-message.md).

## Used by

[docs/components/StaffChatWindow.md](../components/StaffChatWindow.md) — appends the returned message directly to the local transcript rather than waiting for the next poll.
