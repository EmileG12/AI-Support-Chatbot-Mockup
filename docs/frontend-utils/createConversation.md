# createConversation

`frontend/src/api.ts`

## Signature

```ts
function createConversation(mode: "support" | "sales"): Promise<{ conversationId: string }>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations` with `{ mode }`. On a non-OK response, reads the JSON
body's `error` field and throws that (falling back to a generic message). Returns `{ conversationId }`
— see [docs/api-routes/post-api-conversations.md](../api-routes/post-api-conversations.md).

## Used by

[docs/components/App.md](../components/App.md) — called the moment the customer picks a mode on
[ModeSelectCard](../components/ModeSelectCard.md), before [sendChatMessage](sendChatMessage.md) is
ever called for that conversation.
