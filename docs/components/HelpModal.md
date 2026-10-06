# HelpModal

`frontend/src/HelpModal.tsx`

## Purpose

Self-contained "How to use this demo" reference, shown from a small "?" button in the header of
[App](App.md), [StaffDashboard](StaffDashboard.md), and `LeadsDashboard` — so a reviewer clicking
through the live deploy can see how the chat flow, working-hours handoff, and staff dashboards fit
together without reading the README.

## Behavior

No props. Internally tracks `isOpen: boolean`:

- Closed: renders just the `? How to use this demo` trigger button.
- Open: renders a full-screen overlay with a centered modal (closing on either the "×" button or a
  click on the overlay itself, not on a click inside the modal body).

The modal body is one shared, static write-up covering all three pages (customer chat, working-hours
live handoff, staff dashboards) rather than a different snippet per page — a reviewer moving between
pages benefits from seeing the whole flow in one place regardless of which page's "?" they clicked.

## Related

- [docs/components/App.md](App.md)
- [docs/components/StaffDashboard.md](StaffDashboard.md)
