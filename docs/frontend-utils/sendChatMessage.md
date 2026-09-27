# sendChatMessage

`frontend/src/api.ts`

## Signature

```ts
function sendChatMessage(
  message: string,
  conversationId: string | null
): Promise<ChatResponse>
```

## Behavior

`POST`s to `${API_BASE_URL}/api/chat` with `{ message, conversationId }` (`conversationId` omitted if `null`, so the backend starts a new conversation as a fallback — in normal use it's already set from [createConversation](createConversation.md)). Throws if the response is not OK. Returns `{ conversationId, reply, ticket, lead, pendingContact, handoffStatus, estimatedWaitMinutes }` — see [docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md). `ticket` is set for support conversations, `lead` for sales ones.

## Used by

[docs/components/App.md](../components/App.md)
