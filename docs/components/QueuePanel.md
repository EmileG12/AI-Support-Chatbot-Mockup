# QueuePanel

`frontend/src/QueuePanel.tsx`

## Purpose

Rendered inside [App](App.md)'s staff-panel, next to the customer's own chat (not on
[StaffDashboard](StaffDashboard.md) — see [App](App.md) for why). Shows customers currently
waiting for a staff member (see the [working-hours handoff](../backend-services/conversationFlow.md))
and lets staff join one.

## Props

```ts
interface QueuePanelProps {
  onJoined: (conversationId: string, result: StaffJoinResponse) => void;
}
```

## Behavior

- Polls [getQueue](../frontend-utils/getQueue.md) every 3s (plus an immediate fetch on mount).
  Shows "No customers waiting." when the list is empty, otherwise each entry's customer name and
  estimated wait.
- Clicking "Join" calls [staffJoin](../frontend-utils/staffJoin.md) for that conversation (button
  shows "Joining…" and is disabled while in flight) and, on success, calls `onJoined` with the
  conversation id and the `{ draftTicket, messages }` result — [App](App.md) owns what happens next
  (opening [StaffChatWindow](StaffChatWindow.md)), this component doesn't render the chat itself.
- A failed join shows an inline error banner.

## Related

- [docs/components/App.md](App.md), [docs/components/StaffChatWindow.md](StaffChatWindow.md)
- [docs/api-routes/get-conversations-queue.md](../api-routes/get-conversations-queue.md), [docs/api-routes/post-staff-join.md](../api-routes/post-staff-join.md)
