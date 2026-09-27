# ModeSelectCard

`frontend/src/ModeSelectCard.tsx`

## Purpose

Shown in [App](App.md) before any message is sent, replacing the normal chat input row: two
buttons, "Customer Support" and "Customer Sales", that pick a conversation's `mode` upfront (see
[docs/db-schema/conversations.md](../db-schema/conversations.md)). Once picked, this card is gone
for the rest of the session - `mode` never changes after the conversation is created.

## Props

```ts
interface ModeSelectCardProps {
  onSelect: (mode: "support" | "sales") => void;
  isSubmitting: boolean;
}
```

Purely presentational — [App](App.md) owns the actual `createConversation` call and the
mode-specific welcome message that follows; `onSelect` is called on click with the chosen mode, and
both buttons are disabled while `isSubmitting`.

## Related

- [docs/frontend-utils/createConversation.md](../frontend-utils/createConversation.md)
- [docs/api-routes/post-api-conversations.md](../api-routes/post-api-conversations.md)
