# app_settings

Defined in `supabase/migrations/20260924020000_add_working_hours_handoff.sql`.

## Purpose

A single-row-per-key settings table. Currently holds one flag, `working_hours`, which toggles the
[live handoff feature](../backend-services/conversationFlow.md): on, a customer is queued for a
staff member instead of the AI handling their issue end-to-end. Toggled from the staff dashboard
header so a demo can switch between "AI handles everything" and "AI hands off to a human" without
a redeploy.

## Current DDL

```sql
create table app_settings (
  key text primary key,
  value boolean not null
);

insert into app_settings (key, value) values ('working_hours', false);
```

RLS enabled, no policies (see [docs/rls-policies/README.md](../rls-policies/README.md)).

## Related

- [docs/backend-services/settings.md](../backend-services/settings.md)
- [docs/api-routes/get-api-settings.md](../api-routes/get-api-settings.md), [docs/api-routes/patch-api-settings.md](../api-routes/patch-api-settings.md)
- [docs/db-schema/conversations.md](conversations.md) — `handoff_status` is what this flag ultimately controls.
