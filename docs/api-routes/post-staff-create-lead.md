# POST /api/conversations/:id/staff-create-lead

`backend/src/app.ts`, delegating to [conversationFlow.createLeadForConversation](../backend-services/conversationFlow.md)

Staff clicked "Create lead" in the [StaffLeadChatWindow](../components/StaffLeadChatWindow.md) -
the sales counterpart to [staff-create-ticket](post-staff-create-ticket.md), turning the (possibly
edited) AI-drafted lead summary into a real lead.

## Request

```ts
{
  category: SalesCategory;
  plan_interested?: string;
  summary: string;
  raw_message: string;
}
```

`400` if `category` isn't a valid `SalesCategory`, or `summary`/`raw_message` are missing/blank.
Unlike [staff-create-ticket](post-staff-create-ticket.md), there's no `status`/`resolution_notes` -
leads have no "resolved" concept (see [leads](../db-schema/leads.md)'s `new`/`contacted`/`closed`
states), so a lead created here always starts at the table's `new` default.

## Behavior

Calls `createLeadForConversation` directly - the exact same insert/mark-the-*conversation*-resolved
path the normal `create_lead` tool call uses (see
[conversationFlow](../backend-services/conversationFlow.md)), just triggered by a staff action
instead of a Claude tool call.

## Response

```ts
{ lead: Lead }
```

`400` with `{ error: string }` on invalid input, `500` on other failures.

## Related

- [docs/frontend-utils/createLeadFromDraft.md](../frontend-utils/createLeadFromDraft.md)
- [docs/api-routes/post-staff-join.md](post-staff-join.md) — where the draft this is built from comes from
- [docs/api-routes/post-staff-create-ticket.md](post-staff-create-ticket.md) — the support counterpart
- [docs/db-schema/leads.md](../db-schema/leads.md)
