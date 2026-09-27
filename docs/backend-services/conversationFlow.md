# conversationFlow

`backend/src/conversationFlow.ts`

## Purpose

Everything about running a turn of the conversation and persisting the result — shared by
`POST /api/chat` and the two contact confirm/correct endpoints — plus the working-hours queue/live
handoff: transitioning a confirmed-contact customer into a queue, a staff member joining and
drafting a ticket (support) or lead (sales) summary, and the staff <-> customer messaging that
follows. The queue/live handoff itself is mode-agnostic — both support and sales conversations
queue and go live the same way; only what gets drafted (a ticket vs. a lead) differs. See
`runSalesTurn` below for the sales-specific classification/lead-creation logic.

## Exports

- `ChatMode` — `"support" | "sales"`, mirroring `conversations.mode`.
- `createConversation(mode: ChatMode): Promise<string>` — inserts a `conversations` row with that mode set upfront and returns its id. Called by `POST /api/conversations` the moment the customer picks "Customer Support" or "Customer Sales", before any message is sent.
- `insertUserMessage(conversationId, content)` — inserts a `role: "user"` row into `messages`.
- `runAndPersistTurn(conversationId): Promise<TurnResult>` — the core shared function, see below.
  `TurnResult = { reply: string; ticket: Record<string, unknown> | null; lead: Record<string, unknown> | null; pendingContact: ContactDetails | null; handoffStatus: HandoffStatus; estimatedWaitMinutes: number | null }`.
- `confirmPendingContact(conversationId): Promise<ContactActionResult | { error: string }>` — customer clicked "Yes".
- `overwriteContact(conversationId, input): Promise<ContactActionResult | { error: string }>` — customer submitted the correction form.
  `ContactActionResult = { reply: string; ticket: Record<string, unknown> | null; lead: Record<string, unknown> | null; handoffStatus: HandoffStatus; estimatedWaitMinutes: number | null }`. Mode-agnostic - works the same whether the pending contact came from the support or sales flow.
- `formatContactConfirmation(contact)` — the fixed "Just to confirm, that's: ... Is that all correct?" template, shared by both flows.
- `formatQueuedMessage(waitMinutes)` — the fixed "you're in the queue, estimated wait N minutes" template, shared by both flows via `queueForHandoff` below.
- `createTicketForConversation(conversationId, ticket: CreateTicketOptions)` — inserts a `tickets` row, copying the conversation's confirmed contact fields, running the duplicate check, and marking the *conversation* `resolved`. `CreateTicketOptions` extends `CreateTicketArgs` with optional `status` (defaults to the table's `'open'` default when omitted) and `resolution_notes`. Used by the normal `create_ticket` flow (`CreateTicketArgs` only, no `status`/`resolution_notes`), `POST /api/conversations/:id/staff-create-ticket`'s plain "Create ticket" (same), and its "Issue resolved" path (`status: "resolved"`, `resolution_notes` set).
- `createLeadForConversation(conversationId, lead: CreateLeadArgs)` — the sales counterpart: inserts a `leads` row copying the conversation's confirmed contact fields, and marks the conversation `resolved`. No duplicate-detection and no `status` option (leads have no "resolved" concept - see [leads](../db-schema/leads.md)'s `new`/`contacted`/`closed` states) - used by both the AI's own `create_lead` tool call and `POST /api/conversations/:id/staff-create-lead`.
- `listQueuedConversations(): Promise<QueueEntry[]>` — conversations with `handoff_status: "queued"`, oldest first, for the dashboard's queue panel. `QueueEntry` includes `mode` (defaulted to `"support"` if the column is somehow null), so the queue can mix support and sales conversations and the panel can badge them.
- `getConversationMessages(conversationId): Promise<ConversationMessagesResult | { error }>` — `{ handoffStatus, estimatedWaitMinutes, draftTicket, draftLead, messages }`. Backs the polling both the customer chat and the staff chat window(s) use; exactly one of `draftTicket`/`draftLead` is ever non-null, depending on the conversation's `mode`.
- `staffJoinConversation(conversationId): Promise<StaffJoinResult | { error }>` — staff clicked "Join"; see below.
- `sendStaffMessage(conversationId, content): Promise<StoredMessage | { error }>` — staff typed a reply while live. Mode-agnostic.
- `draftResolution(conversationId): Promise<{ resolution: string | null }>` — staff clicked "Issue resolved" (support only - see [StaffChatWindow](../components/StaffChatWindow.md)); loads the full history and calls `draftResolutionSummary` (see [ticketAgent](ticketAgent.md)). Purely a read - nothing is stored, unlike `updateDraftTicket` below. The resulting text is only ever persisted if/when staff accepts it via `staff-create-ticket`.

## `queueForHandoff` (module-private)

Shared by both the support and sales branches of `runAndPersistTurn`/`runSalesTurn` below, since
transitioning into the queue works identically regardless of mode: generates a random `1`–`5`
minute wait, updates the conversation to `handoff_status: "queued"` with that estimate and
`queued_at`, inserts the deterministic queued-message template (`formatQueuedMessage`) as an
`assistant` message, and returns it as the turn's result - no Claude call either way.

## `runAndPersistTurn`

1. Loads `mode`, `sales_category`, `contact_confirmed`, `handoff_status`, and `estimated_wait_minutes`
   in a single query (`loadConversationState`).
2. **If `handoff_status` is `"queued"`: returns immediately with `reply: ""` and no Claude call.**
   The message the caller already persisted (via `insertUserMessage`) just sits in the transcript
   until a staff member joins.
   **If `handoff_status` is `"live"`: still no conversational Claude call** (the AI never replies
   directly to the customer again), **but it does re-draft the summary for staff** - `updateDraftLead`
   for a sales conversation with a classified category, `updateDraftTicket` otherwise (see below) -
   so a new customer message keeps the staff member's drafted summary current.
3. **If `mode` is `"sales"`: delegates entirely to `runSalesTurn`** (below) and returns.
4. **If contact was just confirmed (`contact_confirmed: true`, `handoff_status: "none"`) and
   [working hours are on](settings.md):** calls `queueForHandoff` (above). If working hours are off,
   falls through to the normal flow below unchanged.
5. Otherwise (today's original behavior): calls `runAgentTurn(history, contactConfirmed)` (see
   [ticketAgent](ticketAgent.md)). If the result has `pendingContact` (Claude just called
   `collect_contact_details`): saves the (unconfirmed) contact fields onto the `conversations` row,
   inserts the deterministic confirmation text as an `assistant` message, returns it as `reply` — no
   further Claude call this turn. Otherwise: inserts the real `reply` as an `assistant` message if
   non-empty, and if a `ticket` was returned, creates it via `createTicketForConversation`.

## `runSalesTurn` (module-private, called from `runAndPersistTurn` for `mode: "sales"`)

1. If `sales_category` isn't set yet, calls [`runSalesClassifierTurn`](salesAgent.md). If it comes
   back with no category (ambiguous), persists its clarifying question as the `assistant` reply and
   returns - no agent call this turn. If it classifies, persists `sales_category` on the
   conversation **and continues straight into step 2 in the same round-trip**, so the customer's
   first question gets an actual answer immediately rather than just "ok, broadband it is."
2. **If contact was just confirmed and working hours are on** (the exact same check as
   `runAndPersistTurn` step 4 above): calls `queueForHandoff` instead of running the sales agent -
   a sales conversation with confirmed contact during working hours queues for a human exactly like
   a support one does.
3. Otherwise calls [`runSalesAgentTurn(history, category, contactConfirmed)`](salesAgent.md).
   Handles `pendingContact` exactly like the support flow (same confirmation-card template, same
   `conversations` update) and, if a `lead` was returned, creates it via `createLeadForConversation`
   instead of `createTicketForConversation`.

## Confirm / correct endpoints

Both `confirmPendingContact` and `overwriteContact` end by calling a shared `finalizeContact`:

1. Validates the contact details (`overwriteContact`) or checks they were already stored and not
   yet confirmed (`confirmPendingContact` — 400s if already confirmed or if what's stored fails
   validation).
2. Sets `contact_confirmed = true` on the conversation (overwriting the stored fields first, for
   the correction path).
3. Inserts a **synthetic `user`-role message** — `"Yes, that's correct."` for a plain confirm, or
   `"Actually, here are my correct details - Name: ..., Email: ..., Phone: ..., Address: ...,
   Postcode: ..., Account holder: Yes/No."` for a correction — then calls `runAndPersistTurn`. This
   is the exact call where the working-hours queue transition (`queueForHandoff`) actually fires,
   since it's the first `runAndPersistTurn` call after `contact_confirmed` flips to `true`. For a
   sales conversation this instead reaches `runSalesTurn`'s step 2/3, queueing or producing a lead.

**Why a synthetic `user` message, not an assistant one:** an earlier version inserted a
deterministic assistant "handoff" message here before calling `runAndPersistTurn`. That left the
history ending on *two consecutive assistant turns* (the confirmation prompt, then the handoff)
with no user turn between them — Claude's next call had nothing to respond to and just repeated
the confirmation prompt verbatim. Framing the confirm/correct action as a real user turn keeps the
conversation alternating properly, and lets Claude's own reply naturally pick back up on whatever
issue the customer already described (the original point of doing a real call here at all, rather
than another canned message) instead of asking "what can I help with" as if nothing was said.

## `staffJoinConversation`

1. 400s (`{ error }`) unless `handoff_status` is currently `"queued"`. Also reads `mode` and
   `sales_category`.
2. Sets `handoff_status: "live"` and `staff_joined_at`.
3. Calls `updateDraftTicket` for a support conversation, or `updateDraftLead` for a sales one with a
   classified category (below) to produce the initial draft.
4. Returns `{ mode, draftTicket, draftLead, messages }` via `getConversationMessages` - exactly one
   of `draftTicket`/`draftLead` is non-null, matching `mode`. The frontend
   ([App](../components/App.md)) uses `mode` to decide which staff chat window component to render.

Staff can then message back and forth with the customer via `sendStaffMessage` (400s unless
`handoff_status` is `"live"`) and both sides poll `getConversationMessages`, until staff either:

- **Support:** calls `POST /api/conversations/:id/staff-create-ticket` directly with the (possibly
  edited) draft (plain "Create ticket" - ticket starts `open` as normal), or clicks "Issue resolved"
  first (`POST .../draft-resolution` → `draftResolution`, reviewed/edited client-side), then calls
  the same `staff-create-ticket` route with `status: "resolved"` and `resolution_notes` set - the
  route requires `resolution_notes` whenever `status` is `"resolved"`.
- **Sales:** calls `POST /api/conversations/:id/staff-create-lead` with the (possibly edited) draft.
  No resolution flow - leads don't have a resolved-style status (see [leads](../db-schema/leads.md)).

## `updateDraftTicket` / `updateDraftLead` (module-private)

`updateDraftTicket` loads the full history and calls `draftTicketSummary` (see
[ticketAgent](ticketAgent.md)) to produce a category/priority/summary/troubleshooting_notes for the
staff member to read - purely informational, nothing is persisted as a `tickets` row until staff
calls `staff-create-ticket`. If a draft comes back, stores it on `conversations.draft_ticket`; a
`null` result (only possible with an empty history, which can't happen here) leaves the previous
draft in place rather than clearing it.

`updateDraftLead(conversationId, category)` is the sales counterpart, calling
[`draftLeadSummary(history, category)`](salesAgent.md) (needs the classified category to pick the
right system prompt, unlike `draftTicketSummary` which uses one prompt for all support tickets) and
storing the result on `conversations.draft_lead`. Same null-safety behavior.

Both are called from two places: `staffJoinConversation` (the first draft) and
`runAndPersistTurn`'s `"live"` branch (every time the customer sends a new message afterward - see
above). **Never** called for a staff message, since staff already knows what they typed; only new
*customer* input is worth re-drafting over. This means every customer message while live costs one
extra Claude call beyond the (nonexistent) conversational reply - accepted as the cost of keeping
the draft current.

The frontend ([StaffChatWindow](../components/StaffChatWindow.md) /
[StaffLeadChatWindow](../components/StaffLeadChatWindow.md)) is responsible for not letting an
updated draft silently overwrite a staff member's own manual edits to the fields - the backend
always just stores and returns the AI's latest opinion; the approve/dismiss decision is a
client-side concern since only the client knows whether the currently-displayed fields still match
what the AI last suggested.

## `loadHistory` and the `staff` role

The history sent to Claude (`loadHistory`, used by `runAgentTurn`, `draftTicketSummary`,
`runSalesAgentTurn`, and `draftLeadSummary`) maps any `role: "staff"` message to `"assistant"` -
Claude's Messages API only accepts `user`/`assistant` roles, and a staff reply reads to it as an
assistant turn like any other. The `staff` role is preserved as-is everywhere messages are read back
for display (`getConversationMessages`, `GET /api/tickets/:id`, `GET /api/leads/:id`), so the
frontend can style/label it differently from the AI.

## Related

- [docs/backend-services/ticketAgent.md](ticketAgent.md)
- [docs/backend-services/salesAgent.md](salesAgent.md) — the sales-mode counterpart driving `runSalesTurn` and `updateDraftLead`.
- [docs/backend-services/contactValidation.md](contactValidation.md)
- [docs/backend-services/duplicates.md](duplicates.md)
- [docs/backend-services/settings.md](settings.md) — the `working_hours` flag this module checks.
- [docs/db-schema/conversations.md](../db-schema/conversations.md) — `mode`/`sales_category`, plus `handoff_status`/`estimated_wait_minutes`/`queued_at`/`staff_joined_at`/`draft_ticket`/`draft_lead`.
- [docs/db-schema/leads.md](../db-schema/leads.md) — where `createLeadForConversation` writes.
- [docs/components/StaffChatWindow.md](../components/StaffChatWindow.md) / [StaffLeadChatWindow](../components/StaffLeadChatWindow.md) — where the draft-approval decision actually happens.
- [docs/api-routes/README.md](../api-routes/README.md) — all routes that use this module.
