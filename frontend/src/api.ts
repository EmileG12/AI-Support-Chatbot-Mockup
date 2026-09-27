import type {
  ChatMessage,
  ChatMode,
  ChatResponse,
  ContactActionResponse,
  ContactDetails,
  ConversationMessagesResponse,
  DraftLead,
  DraftResolutionResponse,
  DraftTicket,
  Lead,
  LeadDetail,
  QueueEntry,
  Settings,
  StaffJoinResponse,
  Ticket,
  TicketDetail,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, { ...options, credentials: "include" });
}

export async function createConversation(mode: ChatMode): Promise<{ conversationId: string }> {
  const res = await apiFetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to start conversation");
  }
  return res.json();
}

export async function sendChatMessage(
  message: string,
  conversationId: string | null
): Promise<ChatResponse> {
  const res = await apiFetch("/api/chat", {
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

  const res = await apiFetch(`/api/tickets?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load tickets: ${res.status}`);
  const data = await res.json();
  return data.tickets;
}

export async function fetchTicketDetail(id: string): Promise<TicketDetail> {
  const res = await apiFetch(`/api/tickets/${id}`);
  if (!res.ok) throw new Error(`Failed to load ticket: ${res.status}`);
  return res.json();
}

export async function updateTicket(
  id: string,
  updates: Partial<Pick<Ticket, "category" | "priority" | "status" | "duplicate_dismissed">>
): Promise<Ticket> {
  const res = await apiFetch(`/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update ticket: ${res.status}`);
  const data = await res.json();
  return data.ticket;
}

export interface LeadFilters {
  status?: string;
  category?: string;
}

export async function fetchLeads(filters: LeadFilters): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);

  const res = await apiFetch(`/api/leads?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load leads: ${res.status}`);
  const data = await res.json();
  return data.leads;
}

export async function fetchLeadDetail(id: string): Promise<LeadDetail> {
  const res = await apiFetch(`/api/leads/${id}`);
  if (!res.ok) throw new Error(`Failed to load lead: ${res.status}`);
  return res.json();
}

export async function updateLead(
  id: string,
  updates: Partial<Pick<Lead, "category" | "status">>
): Promise<Lead> {
  const res = await apiFetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update lead: ${res.status}`);
  const data = await res.json();
  return data.lead;
}

async function parseOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallbackMessage);
  }
  return res.json();
}

export async function confirmContact(conversationId: string): Promise<ContactActionResponse> {
  const res = await apiFetch(`/api/conversations/${conversationId}/confirm-contact`, {
    method: "POST",
  });
  return parseOrThrow(res, "Failed to confirm contact details");
}

export async function submitContact(
  conversationId: string,
  details: ContactDetails
): Promise<ContactActionResponse> {
  const res = await apiFetch(`/api/conversations/${conversationId}/contact`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return parseOrThrow(res, "Failed to update contact details");
}

export async function getSettings(): Promise<Settings> {
  const res = await apiFetch("/api/settings");
  return parseOrThrow(res, "Failed to load settings");
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const res = await apiFetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return parseOrThrow(res, "Failed to update settings");
}

export async function getQueue(): Promise<QueueEntry[]> {
  const res = await apiFetch("/api/conversations/queue");
  const data = await parseOrThrow<{ queue: QueueEntry[] }>(res, "Failed to load the queue");
  return data.queue;
}

export async function getConversationMessages(conversationId: string): Promise<ConversationMessagesResponse> {
  const res = await apiFetch(`/api/conversations/${conversationId}/messages`);
  return parseOrThrow(res, "Failed to load conversation messages");
}

export async function staffJoin(conversationId: string): Promise<StaffJoinResponse> {
  const res = await apiFetch(`/api/conversations/${conversationId}/staff-join`, {
    method: "POST",
  });
  return parseOrThrow(res, "Failed to join the conversation");
}

export async function sendStaffMessage(conversationId: string, message: string): Promise<ChatMessage> {
  const res = await apiFetch(`/api/conversations/${conversationId}/staff-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await parseOrThrow<{ message: ChatMessage }>(res, "Failed to send message");
  return data.message;
}

export async function createTicketFromDraft(conversationId: string, draft: DraftTicket): Promise<Ticket> {
  const res = await apiFetch(`/api/conversations/${conversationId}/staff-create-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const data = await parseOrThrow<{ ticket: Ticket }>(res, "Failed to create the ticket");
  return data.ticket;
}

export async function createLeadFromDraft(conversationId: string, draft: DraftLead): Promise<Lead> {
  const res = await apiFetch(`/api/conversations/${conversationId}/staff-create-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const data = await parseOrThrow<{ lead: Lead }>(res, "Failed to create the lead");
  return data.lead;
}

export async function draftResolution(conversationId: string): Promise<DraftResolutionResponse> {
  const res = await apiFetch(`/api/conversations/${conversationId}/draft-resolution`, {
    method: "POST",
  });
  return parseOrThrow(res, "Failed to draft resolution notes");
}

export async function resolveTicketFromDraft(
  conversationId: string,
  draft: DraftTicket,
  resolutionNotes: string
): Promise<Ticket> {
  const res = await apiFetch(`/api/conversations/${conversationId}/staff-create-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, status: "resolved", resolution_notes: resolutionNotes }),
  });
  const data = await parseOrThrow<{ ticket: Ticket }>(res, "Failed to resolve the ticket");
  return data.ticket;
}

export async function login(username: string, password: string): Promise<void> {
  const res = await apiFetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  await parseOrThrow(res, "Invalid username or password");
}

export async function logout(): Promise<void> {
  await apiFetch("/api/logout", { method: "POST" });
}

export async function checkAuth(): Promise<boolean> {
  const res = await apiFetch("/api/me");
  return res.ok;
}
