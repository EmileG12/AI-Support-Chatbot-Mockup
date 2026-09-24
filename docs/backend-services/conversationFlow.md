# conversationFlow

`backend/src/conversationFlow.ts`

## Purpose

Everything about running a turn of the conversation and persisting the result — shared by
`POST /api/chat` and the two contact confirm/correct endpoints — plus the working-hours queue/live
handoff: transitioning a confirmed-contact customer into a queue, a staff member joining and
drafting a ticket summary, and the staff <-> customer messaging that follows.

## Exports

- `insertUserMessage(conversationId, content)` — inserts a `role: "user"` row into `messages`.
- `runAndPersistTurn(conversationId): Promise<TurnResult>` — the core shared function, see below.
  `TurnResult = { reply: string; ticket: Record<string, unknown> | null; pendingContact: ContactDetails | null; handoffStatus: HandoffStatus; estimatedWaitMinutes: number | null }`.
- `confirmPendingContact(conversationId): Promise<ContactActionResult | { error: string }>` — customer clicked "Yes".
- `overwriteContact(conversationId, input): Promise<ContactActionResult | { error: string }>` — customer submitted the correction form.
  `ContactActionResult = { reply: string; ticket: Record<string, unknown> | null; handoffStatus: HandoffStatus; estimatedWaitMinutes: number | null }`.
- `formatContactConfirmation(contact)` — the fixed "Just to confirm, that's: ... Is that all correct?" template.
- `formatQueuedMessage(waitMinutes)` — the fixed "you're in the queue, estimated wait N minutes" template.
- `createTicketForConversation(conversationId, ticket: CreateTicketOptions)` — inserts a `tickets` row, copying the conversation's confirmed contact fields, running the duplicate check, and marking the *conversation* `resolved`. `CreateTicketOptions` extends `CreateTicketArgs` with optional `status` (defaults to the table's `'open'` default when omitted) and `resolution_notes`. Used by the normal `create_ticket` flow (`CreateTicketArgs` only, no `status`/`resolution_notes`), `POST /api/conversations/:id/staff-create-ticket`'s plain "Create ticket" (same), and its "Issue resolved" path (`status: "resolved"`, `resolution_notes` set).
- `listQueuedConversations(): Promise<QueueEntry[]>` — conversations with `handoff_status: "queued"`, oldest first, for the dashboard's queue panel.
- `getConversationMessages(conversationId): Promise<ConversationMessagesResult | { error }>` — `{ handoffStatus, estimatedWaitMinutes, draftTicket, messages }`. Backs the polling both the customer chat and the staff chat window use.
- `staffJoinConversation(conversationId): Promise<StaffJoinResult | { error }>` — staff clicked "Join"; see below.
- `sendStaffMessage(conversationId, content): Promise<StoredMessage | { error }>` — staff typed a reply while live.
- `draftResolution(conversationId): Promise<{ resolution: string | null }>` — staff clicked "Issue resolved"; loads the full history and calls `draftResolutionSummary` (see [ticketAgent](ticketAgent.md)). Purely a read - nothing is stored, unlike `updateDraftTicket` below. The resulting text is only ever persisted if/when staff accepts it via `staff-create-ticket`.

## `runAndPersistTurn`

1. Loads `contact_confirmed`, `handoff_status`, and `estimated_wait_minutes` in a single query
   (`loadConversationState`).
2. **If `handoff_status` is `"queued"`: returns immediately with `reply: ""` and no Claude call.**
   The message the caller already persisted (via `insertUserMessage`) just sits in the transcript
   until a staff member joins.
   **If `handoff_status` is `"live"`: still no conversational Claude call** (the AI never replies
   directly to the customer again), **but it does call `updateDraftTicket`** — see below — so a new
   customer message keeps the staff member's drafted ticket summary current.
3. **If contact was just confirmed (`contact_confirmed: true`, `handoff_status: "none"`) and
   [working hours are on](settings.md):** generates a random `1`–`5` minute wait, updates the
   conversation to `handoff_status: "queued"` with that estimate and `queued_at`, inserts the
   deterministic queued-message template as an `assistant` message, and returns it — again, no
   Claude call. If working hours are off, falls through to the normal flow below unchanged.
4. Otherwise (today's original behavior): calls `runAgentTurn(history, contactConfirmed)` (see
   [ticketAgent](ticketAgent.md)). If the result has `pendingContact` (Claude just called
   `collect_contact_details`): saves the (unconfirmed) contact fields onto the `conversations` row,
   inserts the deterministic confirmation text as an `assistant` message, returns it as `reply` — no
   further Claude call this turn. Otherwise: inserts the real `reply` as an `assistant` message if
   non-empty, and if a `ticket` was returned, creates it via `createTicketForConversation`.

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
   is the exact call where the working-hours queue transition (step 3 above) actually fires, since
   it's the first `runAndPersistTurn` call after `contact_confirmed` flips to `true`.

**Why a synthetic `user` message, not an assistant one:** an earlier version inserted a
deterministic assistant "handoff" message here before calling `runAndPersistTurn`. That left the
history ending on *two consecutive assistant turns* (the confirmation prompt, then the handoff)
with no user turn between them — Claude's next call had nothing to respond to and just repeated
the confirmation prompt verbatim. Framing the confirm/correct action as a real user turn keeps the
conversation alternating properly, and lets Claude's own reply naturally pick back up on whatever
issue the customer already described (the original point of doing a real call here at all, rather
than another canned message) instead of asking "what can I help with" as if nothing was said.

## `staffJoinConversation`

1. 400s (`{ error }`) unless `handoff_status` is currently `"queued"`.
2. Sets `handoff_status: "live"` and `staff_joined_at`.
3. Calls `updateDraftTicket` (below) to produce the initial draft.
4. Returns `{ draftTicket, messages }` via `getConversationMessages`.

Staff can then message back and forth with the customer via `sendStaffMessage` (400s unless
`handoff_status` is `"live"`) and both sides poll `getConversationMessages`, until staff either:

- calls `POST /api/conversations/:id/staff-create-ticket` directly with the (possibly edited) draft
  (plain "Create ticket" - ticket starts `open` as normal), or
- clicks "Issue resolved" first (`POST .../draft-resolution` → `draftResolution`, reviewed/edited
  client-side), then calls the same `staff-create-ticket` route with `status: "resolved"` and
  `resolution_notes` set - the route requires `resolution_notes` whenever `status` is `"resolved"`.

## `updateDraftTicket` (module-private)

Loads the full history and calls `draftTicketSummary` (see [ticketAgent](ticketAgent.md)) to
produce a category/priority/summary/troubleshooting_notes for the staff member to read - purely
informational, nothing is persisted as a `tickets` row until staff calls `staff-create-ticket`. If
a draft comes back, stores it on `conversations.draft_ticket`; a `null` result (only possible with
an empty history, which can't happen here) leaves the previous draft in place rather than clearing
it.

Called from two places: `staffJoinConversation` (the first draft) and `runAndPersistTurn`'s `"live"`
branch (every time the customer sends a new message afterward - see above). **Never** called for a
staff message, since staff already knows what they typed; only new *customer* input is worth
re-drafting over. This means every customer message while live costs one extra Claude call beyond
the (nonexistent) conversational reply - accepted as the cost of keeping the draft current.

The frontend ([StaffChatWindow](../components/StaffChatWindow.md)) is responsible for not letting
an updated draft silently overwrite a staff member's own manual edits to the fields - the backend
always just stores and returns the AI's latest opinion; the approve/dismiss decision is a
client-side concern since only the client knows whether the currently-displayed fields still match
what the AI last suggested.

## `loadHistory` and the `staff` role

The history sent to Claude (`loadHistory`, used by both `runAgentTurn` and `draftTicketSummary`)
maps any `role: "staff"` message to `"assistant"` - Claude's Messages API only accepts `user`/
`assistant` roles, and a staff reply reads to it as an assistant turn like any other. The `staff`
role is preserved as-is everywhere messages are read back for display (`getConversationMessages`,
`GET /api/tickets/:id`), so the frontend can style/label it differently from the AI.

## Related

- [docs/backend-services/ticketAgent.md](ticketAgent.md)
- [docs/backend-services/contactValidation.md](contactValidation.md)
- [docs/backend-services/duplicates.md](duplicates.md)
- [docs/backend-services/settings.md](settings.md) — the `working_hours` flag this module checks.
- [docs/db-schema/conversations.md](../db-schema/conversations.md) — `handoff_status`/`estimated_wait_minutes`/`queued_at`/`staff_joined_at`/`draft_ticket`.
- [docs/components/StaffChatWindow.md](../components/StaffChatWindow.md) — where the draft-approval decision actually happens.
- [docs/api-routes/README.md](../api-routes/README.md) — all routes that use this module.
