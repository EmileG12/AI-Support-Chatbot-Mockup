# ContactConfirmCard.test.tsx

`frontend/src/ContactConfirmCard.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [ContactConfirmCard](../components/ContactConfirmCard.md). No mocking needed — pure
presentation over its props.

## Covers

- Renders the captured name/email/phone.
- "Yes, that's correct" calls `onConfirm`.
- "Edit details" calls `onEdit`.
- Both buttons are disabled while `isSubmitting` is true.
