import type {
  ChatMessage,
  ChatResponse,
  ContactActionResponse,
  ContactDetails,
  ConversationMessagesResponse,
  DraftTicket,
  QueueEntry,
  Settings,
  StaffJoinResponse,
  Ticket,
  TicketDetail,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function sendChatMessage(
  message: string,
  conversationId: string | null
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversationId: conversationId ?? undefined }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  return res.json();
}

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
}

export async function fetchTickets(filters: TicketFilters): Promise<Ticket[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.priority) params.set("priority", filters.priority);

  const res = await fetch(`${API_BASE_URL}/api/tickets?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load tickets: ${res.status}`);
  const data = await res.json();
  return data.tickets;
}

export async function fetchTicketDetail(id: string): Promise<TicketDetail> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${id}`);
  if (!res.ok) throw new Error(`Failed to load ticket: ${res.status}`);
  return res.json();
}

export async function updateTicket(
  id: string,
  updates: Partial<Pick<Ticket, "category" | "priority" | "status" | "duplicate_dismissed">>
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update ticket: ${res.status}`);
  const data = await res.json();
  return data.ticket;
}

async function parseOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallbackMessage);
  }
  return res.json();
}

export async function confirmContact(conversationId: string): Promise<ContactActionResponse> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/confirm-contact`, {
    method: "POST",
  });
  return parseOrThrow(res, "Failed to confirm contact details");
}

export async function submitContact(
  conversationId: string,
  details: ContactDetails
): Promise<ContactActionResponse> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/contact`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return parseOrThrow(res, "Failed to update contact details");
}

export async function getSettings(): Promise<Settings> {
  const res = await fetch(`${API_BASE_URL}/api/settings`);
  return parseOrThrow(res, "Failed to load settings");
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const res = await fetch(`${API_BASE_URL}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return parseOrThrow(res, "Failed to update settings");
}

export async function getQueue(): Promise<QueueEntry[]> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/queue`);
  const data = await parseOrThrow<{ queue: QueueEntry[] }>(res, "Failed to load the queue");
  return data.queue;
}

export async function getConversationMessages(conversationId: string): Promise<ConversationMessagesResponse> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`);
  return parseOrThrow(res, "Failed to load conversation messages");
}

export async function staffJoin(conversationId: string): Promise<StaffJoinResponse> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/staff-join`, {
    method: "POST",
  });
  return parseOrThrow(res, "Failed to join the conversation");
}

export async function sendStaffMessage(conversationId: string, message: string): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/staff-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await parseOrThrow<{ message: ChatMessage }>(res, "Failed to send message");
  return data.message;
}

export async function createTicketFromDraft(conversationId: string, draft: DraftTicket): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/staff-create-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const data = await parseOrThrow<{ ticket: Ticket }>(res, "Failed to create the ticket");
  return data.ticket;
}
