export type TicketCategory =
  | "broadband_fault"
  | "mobile_fault"
  | "billing"
  | "provisioning"
  | "account"
  | "complaint"
  | "other";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface Ticket {
  id: string;
  category: TicketCategory;
  priority: TicketPriority;
  summary: string;
  status: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  ticket: Ticket | null;
}
