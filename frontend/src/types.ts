export type TicketCategory =
  | "broadband_fault"
  | "mobile_fault"
  | "landline_fault"
  | "voip_fault"
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
  role: "user" | "assistant" | "staff";
  content: string;
}

export type HandoffStatus = "none" | "queued" | "live";

export interface ChatResponse {
  conversationId: string;
  reply: string;
  ticket: Ticket | null;
  pendingContact: ContactDetails | null;
  handoffStatus?: HandoffStatus;
  estimatedWaitMinutes?: number | null;
}

export interface ContactActionResponse {
  reply: string;
  ticket: Ticket | null;
  handoffStatus?: HandoffStatus;
  estimatedWaitMinutes?: number | null;
}

export interface TicketDetail {
  ticket: Ticket;
  messages: ChatMessage[];
  duplicateOf: { id: string; summary: string } | null;
}

export interface Settings {
  workingHours: boolean;
}

export interface QueueEntry {
  id: string;
  customer_name: string | null;
  queued_at: string | null;
  estimated_wait_minutes: number | null;
}

/** The AI's draft category/priority/summary for a staff member to read and edit. */
export interface DraftTicket {
  category: TicketCategory;
  priority: TicketPriority;
  summary: string;
  raw_message: string;
  troubleshooting_notes?: string;
}

export interface ConversationMessagesResponse {
  handoffStatus: HandoffStatus;
  estimatedWaitMinutes: number | null;
  messages: ChatMessage[];
}

export interface StaffJoinResponse {
  draftTicket: DraftTicket | null;
  messages: ChatMessage[];
}
