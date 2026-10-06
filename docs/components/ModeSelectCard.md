# ModeSelectCard

`frontend/src/ModeSelectCard.tsx`

## Purpose

Shown in [App](App.md) before any message is sent, rendered as its own message bubble inline at the
end of the message list (not replacing the chat input row, which stays hidden until a mode is
picked): a "Customer Support" / "Customer Sales" radio pair plus a "Continue" button, that pick a
conversation's `mode` upfront (see [docs/db-schema/conversations.md](../db-schema/conversations.md)).
Once picked, this card is gone for the rest of the session - `mode` never changes after the
conversation is created.

## Props

```ts
interface ModeSelectCardProps {
  onSelect: (mode: "support" | "sales") => void;
  isSubmitting: boolean;
}
```

Keeps its own local `selected: ChatMode | null` radio state; "Continue" is disabled until one option
is picked or while `isSubmitting`, and only then calls `onSelect` with the chosen mode. Otherwise
purely presentational — [App](App.md) owns the actual `createConversation` call and the
mode-specific welcome message that follows.

## Related

- [docs/frontend-utils/createConversation.md](../frontend-utils/createConversation.md)
- [docs/api-routes/post-api-conversations.md](../api-routes/post-api-conversations.md)
