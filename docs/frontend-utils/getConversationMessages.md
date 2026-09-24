# getConversationMessages

`frontend/src/api.ts`

## Signature

```ts
function getConversationMessages(conversationId: string): Promise<ConversationMessagesResponse>
```

## Behavior

`GET`s `${API_BASE_URL}/api/conversations/${conversationId}/messages`. Throws (via `parseOrThrow`)
on a non-OK response. Returns `{ handoffStatus, estimatedWaitMinutes, messages }` — see
[docs/api-routes/get-conversation-messages.md](../api-routes/get-conversation-messages.md).

## Used by

- [docs/components/App.md](../components/App.md) — polled every 2.5s once `handoffStatus` is `"queued"`/`"live"`; each tick fully replaces the transcript with this authoritative server copy.
- [docs/components/StaffChatWindow.md](../components/StaffChatWindow.md) — same pattern, for the staff side.
