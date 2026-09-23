# duplicates

`backend/src/duplicates.ts`

## Purpose

Thin wrapper around the `find_possible_duplicate_ticket` Postgres RPC function, called before a new ticket is inserted.

## Exports

```ts
interface DuplicateMatch {
  id: string;
  summary: string;
  similarity: number;
}

function findPossibleDuplicateTicket(
  category: TicketCategory,
  text: string
): Promise<DuplicateMatch | null>
```

## Behavior

Calls `supabase.rpc("find_possible_duplicate_ticket", { p_category: category, p_text: text })`. Returns the first row if any, else `null`. On an RPC error, logs it and returns `null` (a lookup failure degrades to "no duplicate found" rather than blocking ticket creation).

## Related

- [docs/rpc-functions/find_possible_duplicate_ticket.md](../rpc-functions/find_possible_duplicate_ticket.md) — the underlying SQL function and its similarity threshold/window.
- [docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md) — calls this with `${ticket.raw_message} ${ticket.summary}` as the text to match.
