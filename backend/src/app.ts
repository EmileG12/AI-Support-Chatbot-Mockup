import express from "express";
import cors from "cors";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { supabase } from "./supabaseClient.js";
import { runAgentTurn, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "./ticketAgent.js";
import { findPossibleDuplicateTicket } from "./duplicates.js";

export const app = express();
app.use(cors());
app.use(express.json());

interface ChatRequestBody {
  conversationId?: string;
  message: string;
}

app.post("/api/chat", async (req, res) => {
  const { conversationId, message } = req.body as ChatRequestBody;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({})
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Failed to create conversation");
      activeConversationId = data.id as string;
    }

    const { error: insertUserMsgError } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "user",
      content: message,
    });
    if (insertUserMsgError) throw insertUserMsgError;

    const { data: priorMessages, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true });
    if (historyError) throw historyError;

    const history: MessageParam[] = (priorMessages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
    }));

    const { reply, ticket } = await runAgentTurn(history);

    if (reply) {
      const { error: insertAssistantMsgError } = await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: reply,
      });
      if (insertAssistantMsgError) throw insertAssistantMsgError;
    }

    let createdTicket = null;
    if (ticket) {
      const duplicate = await findPossibleDuplicateTicket(
        ticket.category,
        `${ticket.raw_message} ${ticket.summary}`
      );

      const { data: ticketRow, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          conversation_id: activeConversationId,
          customer_name: ticket.customer_name ?? null,
          customer_contact: ticket.customer_contact ?? null,
          category: ticket.category,
          priority: ticket.priority,
          summary: ticket.summary,
          raw_message: ticket.raw_message,
          troubleshooting_notes: ticket.troubleshooting_notes ?? null,
          possible_duplicate_of: duplicate?.id ?? null,
          duplicate_similarity: duplicate?.similarity ?? null,
        })
        .select()
        .single();
      if (ticketError) throw ticketError;
      createdTicket = ticketRow;

      await supabase
        .from("conversations")
        .update({ status: "resolved" })
        .eq("id", activeConversationId);
    }

    res.json({
      conversationId: activeConversationId,
      reply,
      ticket: createdTicket,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong handling the chat message" });
  }
});

app.get("/api/tickets", async (req, res) => {
  try {
    let query = supabase.from("tickets").select("*").order("created_at", { ascending: false });

    const { status, category, priority } = req.query;
    if (typeof status === "string" && status !== "all") query = query.eq("status", status);
    if (typeof category === "string" && category !== "all") query = query.eq("category", category);
    if (typeof priority === "string" && priority !== "all") query = query.eq("priority", priority);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ tickets: data ?? [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

app.get("/api/tickets/:id", async (req, res) => {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (ticketError) throw ticketError;
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", ticket.conversation_id)
      .order("created_at", { ascending: true });
    if (messagesError) throw messagesError;

    let duplicateOf: { id: string; summary: string } | null = null;
    if (ticket.possible_duplicate_of) {
      const { data: dup } = await supabase
        .from("tickets")
        .select("id, summary")
        .eq("id", ticket.possible_duplicate_of)
        .single();
      duplicateOf = dup ?? null;
    }

    res.json({ ticket, messages: messages ?? [], duplicateOf });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load ticket" });
  }
});

interface UpdateTicketBody {
  category?: string;
  priority?: string;
  status?: string;
}

app.patch("/api/tickets/:id", async (req, res) => {
  const { category, priority, status } = req.body as UpdateTicketBody;
  const updates: Record<string, string> = {};

  if (category !== undefined) {
    if (!TICKET_CATEGORIES.includes(category as (typeof TICKET_CATEGORIES)[number])) {
      return res.status(400).json({ error: `Invalid category: ${category}` });
    }
    updates.category = category;
  }
  if (priority !== undefined) {
    if (!TICKET_PRIORITIES.includes(priority as (typeof TICKET_PRIORITIES)[number])) {
      return res.status(400).json({ error: `Invalid priority: ${priority}` });
    }
    updates.priority = priority;
  }
  if (status !== undefined) {
    if (!TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number])) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const { data, error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ ticket: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
