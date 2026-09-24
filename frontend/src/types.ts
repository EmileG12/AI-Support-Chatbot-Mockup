export type TicketCategory =
  | "broadband_fault"
  | "mobile_fault"
  | "landline_fault"
  | "billing"
  | "provisioning"
  | "account"
  | "complaint"
  | "other";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  isAccountHolder: boolean;
}

export interface Ticket {
  id: string;
  conversation_id: string;
  category: TicketCategory;
  priority: TicketPriority;
  summary: string;
  status: TicketStatus;
  created_at: string;
  raw_message: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_postcode?: string | null;
  customer_is_account_holder?: boolean | null;
  troubleshooting_notes?: string | null;
  possible_duplicate_of?: string | null;
  duplicate_similarity?: number | null;
  duplicate_dismissed?: boolean;
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
  pendingContact: ContactDetails | null;
}

export interface ContactActionResponse {
  reply: string;
  ticket: Ticket | null;
}

export interface TicketDetail {
  ticket: Ticket;
  messages: ChatMessage[];
  duplicateOf: { id: string; summary: string } | null;
}
