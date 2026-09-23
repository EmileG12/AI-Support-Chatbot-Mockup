import { supabase } from "./supabaseClient.js";
import type { TicketCategory } from "./ticketAgent.js";

export interface DuplicateMatch {
  id: string;
  summary: string;
  similarity: number;
}

export async function findPossibleDuplicateTicket(
  category: TicketCategory,
  text: string
): Promise<DuplicateMatch | null> {
  const { data, error } = await supabase.rpc("find_possible_duplicate_ticket", {
    p_category: category,
    p_text: text,
  });

  if (error) {
    console.error("Duplicate detection lookup failed:", error);
    return null;
  }

  const match = data?.[0];
  return match ? (match as DuplicateMatch) : null;
}
