import type { ChatResponse, Ticket, TicketDetail } from "./types";

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
  updates: Partial<Pick<Ticket, "category" | "priority" | "status">>
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
