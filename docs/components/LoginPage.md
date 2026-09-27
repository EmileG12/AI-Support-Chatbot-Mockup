# LoginPage

`frontend/src/LoginPage.tsx` — route `/login`

## Purpose

The single-account sign-in form. The only route not wrapped by [AuthGate](AuthGate.md).

## Behavior

- Local state: `username`, `password`, `error`, `submitting`.
- On submit, calls [login](../frontend-utils/login.md) with the entered credentials.
  - On success, navigates to the path the user was originally trying to reach — read from
    `location.state.from.pathname` (set by [AuthGate](AuthGate.md) when it redirects here), falling
    back to `/` if there isn't one — via `navigate(from, { replace: true })`.
  - On failure, shows the thrown error's message (e.g. "Invalid username or password") without
    navigating.
- Disables the submit button while `submitting`.

## Related

- [docs/frontend-utils/login.md](../frontend-utils/login.md)
- [docs/components/AuthGate.md](AuthGate.md)
