# QueuePanel.test.tsx

`frontend/src/QueuePanel.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [QueuePanel](../components/QueuePanel.md). Mocks the `frontend/src/api.ts` boundary
(`getQueue`, `staffJoin`) — no real network calls.

## Covers

- Shows "No customers waiting." when the queue is empty.
- Lists a queued entry's customer name, estimated wait, and a "Support" mode badge.
- Shows a "Sales" badge for an entry whose `mode` is `"sales"`.
- Clicking "Join" calls `staffJoin` with that conversation's id and calls `onJoined` with the id and
  the `{ draftTicket, messages }` result.
