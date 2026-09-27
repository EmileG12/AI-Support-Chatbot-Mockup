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
  resolution_notes?: string | null;
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

export type ChatMode = "support" | "sales";
export type SalesCategory = "broadband" | "mobile";
export type LeadStatus = "new" | "contacted" | "closed";

export interface Lead {
  id: string;
  conversation_id: string;
  category: SalesCategory;
  plan_interested?: string | null;
  summary: string;
  status: LeadStatus;
  created_at: string;
  raw_message: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_postcode?: string | null;
  customer_is_account_holder?: boolean | null;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  ticket: Ticket | null;
  lead?: Lead | null;
  pendingContact: ContactDetails | null;
  handoffStatus?: HandoffStatus;
  estimatedWaitMinutes?: number | null;
}

export interface ContactActionResponse {
  reply: string;
  ticket: Ticket | null;
  lead?: Lead | null;
  handoffStatus?: HandoffStatus;
  estimatedWaitMinutes?: number | null;
}

export interface TicketDetail {
  ticket: Ticket;
  messages: ChatMessage[];
  duplicateOf: { id: string; summary: string } | null;
}

export interface LeadDetail {
  lead: Lead;
  messages: ChatMessage[];
}

export interface Settings {
  workingHours: boolean;
}

export interface QueueEntry {
  id: string;
  mode: ChatMode;
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

/** Sales-mode counterpart to DraftTicket - the AI's draft lead for a staff member to read and edit. */
export interface DraftLead {
  category: SalesCategory;
  plan_interested?: string;
  summary: string;
  raw_message: string;
}

export interface ConversationMessagesResponse {
  handoffStatus: HandoffStatus;
  estimatedWaitMinutes: number | null;
  draftTicket: DraftTicket | null;
  draftLead: DraftLead | null;
  messages: ChatMessage[];
}

export interface StaffJoinResponse {
  mode: ChatMode;
  draftTicket: DraftTicket | null;
  draftLead: DraftLead | null;
  messages: ChatMessage[];
}

export interface DraftResolutionResponse {
  resolution: string | null;
}
