import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PUBLIC_PATHS, requireAuth, login, logout, me } from "./auth.js";
import { supabase } from "./supabaseClient.js";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type CreateTicketArgs } from "./ticketAgent.js";
import { SALES_CATEGORIES, LEAD_STATUSES, type CreateLeadArgs } from "./salesAgent.js";
import {
  runAndPersistTurn,
  insertUserMessage,
  createConversation,
  confirmPendingContact,
  overwriteContact,
  listQueuedConversations,
  getConversationMessages,
  staffJoinConversation,
  sendStaffMessage,
  createTicketForConversation,
  createLeadForConversation,
  draftResolution,
  type ChatMode,
} from "./conversationFlow.js";
import type { ContactDetails } from "./contactValidation.js";
import { getWorkingHours, setWorkingHours } from "./settings.js";

export const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path)) return next();
  requireAuth(req, res, next);
});

app.post("/api/login", login);
app.post("/api/logout", logout);
app.get("/api/me", me);

interface ConversationRequestBody {
  mode?: string;
}

app.post("/api/conversations", async (req, res) => {
  const { mode } = req.body as ConversationRequestBody;

  if (mode !== "support" && mode !== "sales") {
    return res.status(400).json({ error: `Invalid mode: ${mode}` });
  }

  try {
    const conversationId = await createConversation(mode as ChatMode);
    res.json({ conversationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

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

    await insertUserMessage(activeConversationId, message);

    const { reply, ticket, lead, pendingContact, handoffStatus, estimatedWaitMinutes } =
      await runAndPersistTurn(activeConversationId);

    res.json({
      conversationId: activeConversationId,
      reply,
      ticket,
      lead,
      pendingContact,
      handoffStatus,
      estimatedWaitMinutes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong handling the chat message" });
  }
});

app.post("/api/conversations/:id/confirm-contact", async (req, res) => {
  try {
    const result = await confirmPendingContact(req.params.id);
    if ("error" in result) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to confirm contact details" });
  }
});

app.patch("/api/conversations/:id/contact", async (req, res) => {
  try {
    const result = await overwriteContact(req.params.id, req.body as Partial<ContactDetails>);
    if ("error" in result) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update contact details" });
  }
});

interface SettingsBody {
  workingHours?: unknown;
}

app.get("/api/settings", async (_req, res) => {
  try {
    const workingHours = await getWorkingHours();
    res.json({ workingHours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

app.patch("/api/settings", async (req, res) => {
  const { workingHours } = req.body as SettingsBody;
  if (typeof workingHours !== "boolean") {
    return res.status(400).json({ error: "workingHours must be a boolean" });
  }

  try {
    await setWorkingHours(workingHours);
    res.json({ workingHours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

app.get("/api/conversations/queue", async (_req, res) => {
  try {
    const queue = await listQueuedConversations();
    res.json({ queue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load the queue" });
  }
});

app.get("/api/conversations/:id/messages", async (req, res) => {
  try {
    const result = await getConversationMessages(req.params.id);
    if ("error" in result) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load conversation messages" });
  }
});

app.post("/api/conversations/:id/staff-join", async (req, res) => {
  try {
    const result = await staffJoinConversation(req.params.id);
    if ("error" in result) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join the conversation" });
  }
});

interface StaffMessageBody {
  message?: string;
}

app.post("/api/conversations/:id/staff-message", async (req, res) => {
  const { message } = req.body as StaffMessageBody;
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const result = await sendStaffMessage(req.params.id, message);
    if ("error" in result) return res.status(400).json({ error: result.error });
    res.json({ message: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send staff message" });
  }
});

interface StaffCreateTicketBody extends Partial<CreateTicketArgs> {
  status?: string;
  resolution_notes?: string;
}

app.post("/api/conversations/:id/staff-create-ticket", async (req, res) => {
  const { category, priority, summary, raw_message, troubleshooting_notes, status, resolution_notes } =
    req.body as StaffCreateTicketBody;

  if (!category || !TICKET_CATEGORIES.includes(category as (typeof TICKET_CATEGORIES)[number])) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }
  if (!priority || !TICKET_PRIORITIES.includes(priority as (typeof TICKET_PRIORITIES)[number])) {
    return res.status(400).json({ error: `Invalid priority: ${priority}` });
  }
  if (!summary || typeof summary !== "string" || !summary.trim()) {
    return res.status(400).json({ error: "summary is required" });
  }
  if (!raw_message || typeof raw_message !== "string" || !raw_message.trim()) {
    return res.status(400).json({ error: "raw_message is required" });
  }
  if (status !== undefined && !TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number])) {
    return res.status(400).json({ error: `Invalid status: ${status}` });
  }
  if (status === "resolved" && (!resolution_notes || !resolution_notes.trim())) {
    return res.status(400).json({ error: "resolution_notes is required when status is resolved" });
  }

  try {
    const ticket = await createTicketForConversation(req.params.id, {
      category,
      priority,
      summary,
      raw_message,
      troubleshooting_notes,
      status: status as (typeof TICKET_STATUSES)[number] | undefined,
      resolution_notes,
    });
    res.json({ ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create the ticket" });
  }
});

type StaffCreateLeadBody = Partial<CreateLeadArgs>;

app.post("/api/conversations/:id/staff-create-lead", async (req, res) => {
  const { category, plan_interested, summary, raw_message } = req.body as StaffCreateLeadBody;

  if (!category || !SALES_CATEGORIES.includes(category as (typeof SALES_CATEGORIES)[number])) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }
  if (!summary || typeof summary !== "string" || !summary.trim()) {
    return res.status(400).json({ error: "summary is required" });
  }
  if (!raw_message || typeof raw_message !== "string" || !raw_message.trim()) {
    return res.status(400).json({ error: "raw_message is required" });
  }

  try {
    const lead = await createLeadForConversation(req.params.id, { category, plan_interested, summary, raw_message });
    res.json({ lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create the lead" });
  }
});

app.post("/api/conversations/:id/draft-resolution", async (req, res) => {
  try {
    const result = await draftResolution(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to draft resolution notes" });
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
  duplicate_dismissed?: boolean;
}

app.patch("/api/tickets/:id", async (req, res) => {
  const { category, priority, status, duplicate_dismissed } = req.body as UpdateTicketBody;
  const updates: Record<string, string | boolean> = {};

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
  if (duplicate_dismissed !== undefined) {
    if (typeof duplicate_dismissed !== "boolean") {
      return res.status(400).json({ error: "duplicate_dismissed must be a boolean" });
    }
    updates.duplicate_dismissed = duplicate_dismissed;
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

app.get("/api/leads", async (req, res) => {
  try {
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

    const { status, category } = req.query;
    if (typeof status === "string" && status !== "all") query = query.eq("status", status);
    if (typeof category === "string" && category !== "all") query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ leads: data ?? [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load leads" });
  }
});

app.get("/api/leads/:id", async (req, res) => {
  try {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (leadError) throw leadError;
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", lead.conversation_id)
      .order("created_at", { ascending: true });
    if (messagesError) throw messagesError;

    res.json({ lead, messages: messages ?? [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load lead" });
  }
});

interface UpdateLeadBody {
  category?: string;
  status?: string;
}

app.patch("/api/leads/:id", async (req, res) => {
  const { category, status } = req.body as UpdateLeadBody;
  const updates: Record<string, string> = {};

  if (category !== undefined) {
    if (!SALES_CATEGORIES.includes(category as (typeof SALES_CATEGORIES)[number])) {
      return res.status(400).json({ error: `Invalid category: ${category}` });
    }
    updates.category = category;
  }
  if (status !== undefined) {
    if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ lead: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
