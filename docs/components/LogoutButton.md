# LogoutButton

`frontend/src/LogoutButton.tsx`

## Purpose

Shared "Log out" control rendered in the header nav of [App](App.md),
[StaffDashboard](StaffDashboard.md), and [LeadsDashboard](LeadsDashboard.md).

## Behavior

On click, calls [logout](../frontend-utils/logout.md) then navigates to `/login`
(`replace: true`). Styled as a plain `<button>` (`.nav-link.logout-link` in `App.css`) to sit
visually alongside the `<Link>`-based nav items around it.

## Related

- [docs/frontend-utils/logout.md](../frontend-utils/logout.md)
