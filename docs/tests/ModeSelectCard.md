# ModeSelectCard.test.tsx

`frontend/src/ModeSelectCard.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [ModeSelectCard](../components/ModeSelectCard.md). No mocking needed — pure presentation over
its props.

## Covers

- "Customer Support" calls `onSelect("support")`.
- "Customer Sales" calls `onSelect("sales")`.
- Both buttons are disabled while `isSubmitting` is true.
