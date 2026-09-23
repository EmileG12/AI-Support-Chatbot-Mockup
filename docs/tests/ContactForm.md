# ContactForm.test.tsx

`frontend/src/ContactForm.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [ContactForm](../components/ContactForm.md). No mocking needed — pure presentation/local
state over its props.

## Covers

- Fields are pre-filled from the `initial` contact.
- Submitting calls `onSubmit` with the edited, trimmed values.
- "Cancel" calls `onCancel`.
- A given `error` prop renders as a banner.
