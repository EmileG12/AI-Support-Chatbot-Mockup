# App

`frontend/src/App.tsx` — route `/`

## Purpose

The customer-facing chat page. Renders a message list, and either a mode-selection card, the chat
input, a contact confirmation card, or a contact correction form depending on where the
conversation is: which mode it's in, and where it is in the upfront contact-collection flow.

## Behavior

- Keeps `messages: ChatMessage[]` in local state, seeded with a single generic greeting ("Are you
  here about an existing issue, or interested in our plans?") - not mode-specific, since no mode
  has been picked yet.
- Keeps `mode: ChatMode | null` (`null` until a mode is picked) and `conversationId: string | null`
  (`null` until [ModeSelectCard](ModeSelectCard.md) is used - see below), reused for every
  subsequent turn in the session (no persistence across a page reload).
- **While `mode` is `null`**: renders [ModeSelectCard](ModeSelectCard.md) in place of the chat
  input. Picking a mode calls `createConversation` (see
  [docs/frontend-utils/createConversation.md](../frontend-utils/createConversation.md)), stores the
  returned `conversationId`, sets `mode`, and appends the matching canned welcome message (contact
  details ask for support; "are you looking for broadband or mobile?" for sales) to `messages`.
  Nothing else on the page (chat input, contact cards) renders until a mode is chosen.
- Once a mode is picked, submitting the chat input calls `sendChatMessage` (see [docs/frontend-utils/sendChatMessage.md](../frontend-utils/sendChatMessage.md)), appends the assistant's reply, and:
  - if the response includes a `ticket`, stores it and renders it via [TicketCard](TicketCard.md);
  - if it includes a `lead` (sales mode only), stores it and renders it via [LeadCard](LeadCard.md);
  - if it includes `pendingContact`, stores it — this is what switches the input row over to
    [ContactConfirmCard](ContactConfirmCard.md). Identical mechanism for both modes; only the
    tool/prompt that produced it differs (see [ticketAgent](../backend-services/ticketAgent.md) vs.
    [salesAgent](../backend-services/salesAgent.md)).
- While `pendingContact` is set, the normal chat `<form>` is not rendered at all — instead:
  - [ContactConfirmCard](ContactConfirmCard.md) is shown by default; "Yes" calls `confirmContact`.
  - Clicking "Edit details" swaps in [ContactForm](ContactForm.md) (`isEditingContact` state);
    submitting calls `submitContact`.
  - Both actions go through `applyContactActionResult`, which appends a small user-facing
    acknowledgment bubble (`"Yes, that's correct."` or `"Updated my contact details."` — chosen by
    the frontend for display; not necessarily byte-identical to the synthetic message the backend
    itself persists, see [conversationFlow](../backend-services/conversationFlow.md)) followed by
    the real reply, then clears `pendingContact` and re-enables the normal chat input.
  - If either action fails (e.g. a validation error from the backend), the error is shown inline
    via [ContactForm](ContactForm.md)'s `error` prop, and a failed "Yes" click falls back to
    showing the edit form so the customer can correct it themselves.
- Shows a "Typing…" placeholder while a chat request is in flight, and an inline error banner if
  the request fails.
- Header includes a `Link` to `/staff` (the [StaffDashboard](StaffDashboard.md)).

## Working-hours live handoff

Mode-agnostic — support and sales conversations both queue/go live the same way once contact is
confirmed (see [conversationFlow](../backend-services/conversationFlow.md)). Every response that
can carry `handoffStatus`/`estimatedWaitMinutes` (`sendChatMessage`, `confirmContact`,
`submitContact`) updates `handoffStatus: HandoffStatus` state (`"none"` by default):

- **`"queued"`**: a `.handoff-banner` shows "Waiting for a team member — estimated wait: N
  minutes." The normal chat input stays enabled (contact is already confirmed by this point) so the
  customer can keep typing while they wait.
- **`"live"`**: the banner instead reads "You're now chatting with a team member." Messages with
  `role: "staff"` render in their own bubble style, labeled "Support agent" or "Sales agent"
  depending on the customer's own `mode` state (not the message itself, which carries no mode).

While `handoffStatus` is `"queued"` or `"live"`, an effect polls
[getConversationMessages](../frontend-utils/getConversationMessages.md) every 2.5s. Each tick
**fully replaces** `messages` with `[GREETING_MESSAGE, ...result.messages]` rather than merging by
id — the server's message ids differ from the client-generated ids used for the messages already
added optimistically during the normal send flow, so a merge-by-id would render the same message
twice under two different ids. A full replace with the authoritative server transcript sidesteps
that entirely (the visible content is identical either way, only the id changes).

## Staff-side panel

The header also has a "Working hours" checkbox (`getSettings` on mount, `updateSettings` on
toggle — see [settings](../backend-services/settings.md)); optimistically flips local state and
rolls back if the request fails.

Below the header, `.app-body` renders `.chat-panel` (the customer chat above) and `.staff-panel`
**side by side** — deliberately on this same page rather than on [StaffDashboard](StaffDashboard.md),
so a single browser tab can demo both sides of the working-hours handoff at once:

- By default, `.staff-panel` renders [QueuePanel](QueuePanel.md), which now lists both support and
  sales conversations (badged by `mode` - see [QueuePanel](QueuePanel.md)). Its `onJoined` callback
  stores `{ id, mode, draftTicket, draftLead, messages }` in `liveConversation` state.
- Once `liveConversation` is set, `.staff-panel` instead renders either
  [StaffLeadChatWindow](StaffLeadChatWindow.md) (`liveConversation.mode === "sales"`) or
  [StaffChatWindow](StaffChatWindow.md) (otherwise) for that conversation - the two components are
  otherwise unrelated, so `App` picks between them entirely on `mode` rather than either component
  branching internally. `onClose` clears `liveConversation` back to the queue view either way;
  `onTicketCreated`/`onLeadCreated` are no-ops here since each panel already shows its own
  "Ticket/Lead #... created." confirmation and "Close" button — there's no ticket/lead list on this
  page to refresh.

## Related

- [docs/components/ModeSelectCard.md](ModeSelectCard.md), [docs/components/TicketCard.md](TicketCard.md), [docs/components/LeadCard.md](LeadCard.md), [docs/components/ContactConfirmCard.md](ContactConfirmCard.md), [docs/components/ContactForm.md](ContactForm.md), [docs/components/QueuePanel.md](QueuePanel.md), [docs/components/StaffChatWindow.md](StaffChatWindow.md), [docs/components/StaffLeadChatWindow.md](StaffLeadChatWindow.md), [docs/components/StaffDashboard.md](StaffDashboard.md)
- [docs/frontend-utils/README.md](../frontend-utils/README.md)
- [docs/api-routes/post-api-conversations.md](../api-routes/post-api-conversations.md), [docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md), [docs/api-routes/post-confirm-contact.md](../api-routes/post-confirm-contact.md), [docs/api-routes/patch-conversation-contact.md](../api-routes/patch-conversation-contact.md), [docs/api-routes/get-conversation-messages.md](../api-routes/get-conversation-messages.md), [docs/api-routes/README.md](../api-routes/README.md) (settings/queue/staff-\* routes)
