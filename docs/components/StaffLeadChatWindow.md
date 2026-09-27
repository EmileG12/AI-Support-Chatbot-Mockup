# StaffLeadChatWindow

`frontend/src/StaffLeadChatWindow.tsx`

## Purpose

The sales counterpart to [StaffChatWindow](StaffChatWindow.md): the panel a staff member sees after
joining a queued **sales** conversation from [QueuePanel](QueuePanel.md) — an editable AI-drafted
lead summary, the live transcript, a reply box, and a "Create lead" action. No resolution flow
(unlike StaffChatWindow's "Issue resolved") since leads have no "resolved" concept — see
[leads](../db-schema/leads.md).

## Props

```ts
interface StaffLeadChatWindowProps {
  conversationId: string;
  initialDraftLead: DraftLead | null;
  initialMessages: ChatMessage[];
  onClose: () => void;
  onLeadCreated: (lead: Lead) => void;
}
```

## Behavior

Mirrors [StaffChatWindow](StaffChatWindow.md)'s structure closely, with a `DraftLead` shaped draft
(`category`, `plan_interested`, `summary`, `raw_message`) instead of a `DraftTicket` one:

- Seeds `draft: DraftLead` from `initialDraftLead`, or a blank one (`category: "broadband"`,
  `raw_message` taken from the first `user` message) if the AI didn't manage to draft one.
  Category `<select>` (via [LeadCard](LeadCard.md)'s `SALES_CATEGORY_LABELS`), a plan-interested
  text input, and a summary `<textarea>` are all editable before creating the lead. Also tracks
  `appliedAiDraft`/`pendingAiDraft: DraftLead | null` exactly like StaffChatWindow, for the same
  "don't silently overwrite a staff edit" reconciliation logic.
- Polls [getConversationMessages](../frontend-utils/getConversationMessages.md) every 2.5s,
  reading `draftLead` instead of `draftTicket` from the response. Stops polling once a lead has
  been created.
- **Draft reconciliation** on each poll (`draftsEqual` compares `category`/`summary`/
  `raw_message`/`plan_interested`) — identical accept-directly-if-unedited /
  hold-for-review-if-edited logic as StaffChatWindow, with a **"Use AI update"** /
  **"Keep my edits"** card.
- Sending a reply calls [sendStaffMessage](../frontend-utils/sendStaffMessage.md), same as
  StaffChatWindow.
- "Create lead" calls [createLeadFromDraft](../frontend-utils/createLeadFromDraft.md) with the
  current (possibly edited) draft. On success, shows "Lead #XXXXXXXX created." and disables further
  editing/replying; calls `onLeadCreated` (a no-op in [App](App.md), same reasoning as
  StaffChatWindow's `onTicketCreated`).
- "Close" calls `onClose` — [App](App.md) owns actually unmounting this panel (back to
  [QueuePanel](QueuePanel.md)).
- Messages with `role: "staff"` are labeled "You" in the transcript.

## Related

- [docs/components/StaffChatWindow.md](StaffChatWindow.md) — the support-flow counterpart this mirrors.
- [docs/components/QueuePanel.md](QueuePanel.md), [docs/components/App.md](App.md), [docs/components/LeadCard.md](LeadCard.md) (`SALES_CATEGORY_LABELS`)
- [docs/api-routes/get-conversation-messages.md](../api-routes/get-conversation-messages.md), [docs/api-routes/post-staff-message.md](../api-routes/post-staff-message.md), [docs/api-routes/post-staff-create-lead.md](../api-routes/post-staff-create-lead.md)
