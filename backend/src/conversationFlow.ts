import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { supabase } from "./supabaseClient.js";
import {
  runAgentTurn,
  draftTicketSummary,
  draftResolutionSummary,
  type CreateTicketArgs,
  type TicketStatus,
} from "./ticketAgent.js";
import {
  runSalesClassifierTurn,
  runSalesAgentTurn,
  draftLeadSummary,
  type CreateLeadArgs,
  type SalesCategory,
} from "./salesAgent.js";
import { findPossibleDuplicateTicket } from "./duplicates.js";
import { validateContactDetails, type ContactDetails } from "./contactValidation.js";
import { getWorkingHours } from "./settings.js";

export type HandoffStatus = "none" | "queued" | "live";
export type ChatMode = "support" | "sales";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "staff";
  content: string;
}

export function formatContactConfirmation(contact: ContactDetails): string {
  return (
    `Just to confirm, that's:\nName: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone}\n` +
    `Address: ${contact.address}\nPostcode: ${contact.postcode}\n` +
    `Account holder: ${contact.isAccountHolder ? "Yes" : "No"}\n\nIs that all correct?`
  );
}

export function formatQueuedMessage(waitMinutes: number): string {
  return (
    `Thanks! Our team is currently handling other chats - you're in the queue and a team member ` +
    `will be with you shortly (estimated wait: ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}). ` +
    `Feel free to add any more details about your issue in the meantime.`
  );
}

/**
 * A random 7-12 day-out contact date for a newly logged lead - deterministic
 * template text, not left to the model to invent (it's told not to promise a
 * specific callback time itself; see salesAgent's SALES_RULES).
 */
export function formatLeadContactPromise(): string {
  const daysOut = 7 + Math.floor(Math.random() * 6); // 7-12 inclusive
  const contactDate = new Date();
  contactDate.setDate(contactDate.getDate() + daysOut);
  const formatted = contactDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `A member of our sales team will be in touch by ${formatted} to get everything set up.`;
}

async function loadHistory(conversationId: string): Promise<MessageParam[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((m) => ({
    // Claude only accepts user/assistant roles - a staff reply reads to it as an assistant turn.
    role: m.role === "user" ? "user" : "assistant",
    content: m.content as string,
  }));
}

interface ConversationState {
  mode: ChatMode;
  salesCategory: SalesCategory | null;
  contactConfirmed: boolean;
  handoffStatus: HandoffStatus;
  estimatedWaitMinutes: number | null;
}

async function loadConversationState(conversationId: string): Promise<ConversationState> {
  const { data } = await supabase
    .from("conversations")
    .select("mode, sales_category, contact_confirmed, handoff_status, estimated_wait_minutes")
    .eq("id", conversationId)
    .single();
  return {
    mode: (data?.mode as ChatMode) ?? "support",
    salesCategory: (data?.sales_category as SalesCategory) ?? null,
    contactConfirmed: data?.contact_confirmed ?? false,
    handoffStatus: (data?.handoff_status as HandoffStatus) ?? "none",
    estimatedWaitMinutes: data?.estimated_wait_minutes ?? null,
  };
}

async function insertMessage(conversationId: string, role: "user" | "assistant" | "staff", content: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
}

export async function insertUserMessage(conversationId: string, content: string) {
  await insertMessage(conversationId, "user", content);
}

/** Customer picked a mode ("Customer Support" / "Customer Sales") before any message was sent. */
export async function createConversation(mode: ChatMode): Promise<string> {
  const { data, error } = await supabase.from("conversations").insert({ mode }).select("id").single();
  if (error || !data) throw error ?? new Error("Failed to create conversation");
  return data.id as string;
}


export interface CreateTicketOptions extends CreateTicketArgs {
  /** Defaults to the `tickets` table's default ('open') when omitted. */
  status?: TicketStatus;
  /** Set when creating a ticket via the "Issue resolved" flow. */
  resolution_notes?: string;
}

export async function createTicketForConversation(conversationId: string, ticket: CreateTicketOptions) {
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "customer_name, customer_email, customer_phone, customer_address, customer_postcode, customer_is_account_holder"
    )
    .eq("id", conversationId)
    .single();

  const duplicate = await findPossibleDuplicateTicket(
    ticket.category,
    `${ticket.raw_message} ${ticket.summary}`
  );

  const insertPayload: Record<string, unknown> = {
    conversation_id: conversationId,
    customer_name: conversation?.customer_name ?? null,
    customer_email: conversation?.customer_email ?? null,
    customer_phone: conversation?.customer_phone ?? null,
    customer_address: conversation?.customer_address ?? null,
    customer_postcode: conversation?.customer_postcode ?? null,
    customer_is_account_holder: conversation?.customer_is_account_holder ?? null,
    category: ticket.category,
    priority: ticket.priority,
    summary: ticket.summary,
    raw_message: ticket.raw_message,
    troubleshooting_notes: ticket.troubleshooting_notes ?? null,
    resolution_notes: ticket.resolution_notes ?? null,
    possible_duplicate_of: duplicate?.id ?? null,
    duplicate_similarity: duplicate?.similarity ?? null,
  };
  if (ticket.status) insertPayload.status = ticket.status;

  const { data: ticketRow, error: ticketError } = await supabase
    .from("tickets")
    .insert(insertPayload)
    .select()
    .single();
  if (ticketError) throw ticketError;

  await supabase.from("conversations").update({ status: "resolved" }).eq("id", conversationId);

  return ticketRow;
}

export async function createLeadForConversation(conversationId: string, lead: CreateLeadArgs) {
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "customer_name, customer_email, customer_phone, customer_address, customer_postcode, customer_is_account_holder"
    )
    .eq("id", conversationId)
    .single();

  const insertPayload = {
    conversation_id: conversationId,
    customer_name: conversation?.customer_name ?? null,
    customer_email: conversation?.customer_email ?? null,
    customer_phone: conversation?.customer_phone ?? null,
    customer_address: conversation?.customer_address ?? null,
    customer_postcode: conversation?.customer_postcode ?? null,
    customer_is_account_holder: conversation?.customer_is_account_holder ?? null,
    category: lead.category,
    plan_interested: lead.plan_interested ?? null,
    summary: lead.summary,
    raw_message: lead.raw_message,
  };

  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select()
    .single();
  if (leadError) throw leadError;

  await supabase.from("conversations").update({ status: "resolved" }).eq("id", conversationId);

  return leadRow;
}

export interface TurnResult {
  reply: string;
  ticket: Record<string, unknown> | null;
  lead: Record<string, unknown> | null;
  pendingContact: ContactDetails | null;
  handoffStatus: HandoffStatus;
  estimatedWaitMinutes: number | null;
}

/**
 * Transitions a conversation into the queue: shared by both the support and
 * sales branches of runAndPersistTurn below, since queueing for a human
 * handoff works identically regardless of mode once contact is confirmed and
 * working hours are on.
 */
async function queueForHandoff(conversationId: string): Promise<TurnResult> {
  const waitMinutes = 1 + Math.floor(Math.random() * 5);
  await supabase
    .from("conversations")
    .update({
      handoff_status: "queued",
      estimated_wait_minutes: waitMinutes,
      queued_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  const queuedText = formatQueuedMessage(waitMinutes);
  await insertMessage(conversationId, "assistant", queuedText);
  return {
    reply: queuedText,
    ticket: null,
    lead: null,
    pendingContact: null,
    handoffStatus: "queued",
    estimatedWaitMinutes: waitMinutes,
  };
}

/**
 * Loads history, runs one Claude turn, and persists whatever it produced (an
 * assistant reply, a new ticket, or a contact-details confirmation prompt).
 * Shared by POST /api/chat and the contact confirm/correct endpoints, since
 * all three need "run a turn against current conversation state and persist
 * the outcome."
 */
export async function runAndPersistTurn(conversationId: string): Promise<TurnResult> {
  const state = await loadConversationState(conversationId);

  // Once queued/live, the AI never replies conversationally - the message the
  // caller already persisted just waits for (or was replied to directly by) a
  // staff member; see staffJoinConversation/insertStaffMessage. While live,
  // though, a customer message is still worth re-drafting the ticket/lead
  // summary over - see updateDraftTicket/updateDraftLead.
  if (state.handoffStatus === "queued") {
    return {
      reply: "",
      ticket: null,
      lead: null,
      pendingContact: null,
      handoffStatus: "queued",
      estimatedWaitMinutes: state.estimatedWaitMinutes,
    };
  }
  if (state.handoffStatus === "live") {
    if (state.mode === "sales" && state.salesCategory) {
      await updateDraftLead(conversationId, state.salesCategory);
    } else {
      await updateDraftTicket(conversationId);
    }
    return {
      reply: "",
      ticket: null,
      lead: null,
      pendingContact: null,
      handoffStatus: "live",
      estimatedWaitMinutes: state.estimatedWaitMinutes,
    };
  }

  // Sales conversations classify/answer via runSalesTurn instead of
  // runAgentTurn below, but go through the exact same queue-check (see
  // queueForHandoff above) once their contact is confirmed.
  if (state.mode === "sales") {
    return runSalesTurn(conversationId, state);
  }

  if (state.contactConfirmed && state.handoffStatus === "none" && (await getWorkingHours())) {
    return queueForHandoff(conversationId);
  }

  const history = await loadHistory(conversationId);
  const { reply, ticket, pendingContact } = await runAgentTurn(history, state.contactConfirmed);

  if (pendingContact) {
    await supabase
      .from("conversations")
      .update({
        customer_name: pendingContact.name,
        customer_email: pendingContact.email,
        customer_phone: pendingContact.phone,
        customer_address: pendingContact.address,
        customer_postcode: pendingContact.postcode,
        customer_is_account_holder: pendingContact.isAccountHolder,
      })
      .eq("id", conversationId);

    const confirmationText = formatContactConfirmation(pendingContact);
    await insertMessage(conversationId, "assistant", confirmationText);
    return {
      reply: confirmationText,
      ticket: null,
      lead: null,
      pendingContact,
      handoffStatus: "none",
      estimatedWaitMinutes: null,
    };
  }

  if (reply) {
    await insertMessage(conversationId, "assistant", reply);
  }

  const createdTicket = ticket ? await createTicketForConversation(conversationId, ticket) : null;

  return {
    reply,
    ticket: createdTicket,
    lead: null,
    pendingContact: null,
    handoffStatus: "none",
    estimatedWaitMinutes: null,
  };
}

/**
 * Sales-mode counterpart to the main body of runAndPersistTurn: classifies
 * broadband-vs-mobile on the first turn (continuing straight into the
 * matching sales agent in the same round-trip once classified), then - once
 * contact is confirmed - queues for a human handoff during working hours
 * exactly like support does (see queueForHandoff), or otherwise runs the
 * sales agent, persisting a pendingContact or a lead the same way the
 * support flow persists a pendingContact or a ticket.
 */
async function runSalesTurn(conversationId: string, state: ConversationState): Promise<TurnResult> {
  const history = await loadHistory(conversationId);

  let category = state.salesCategory;
  if (!category) {
    const classifierResult = await runSalesClassifierTurn(history);
    if (!classifierResult.category) {
      if (classifierResult.reply) {
        await insertMessage(conversationId, "assistant", classifierResult.reply);
      }
      return {
        reply: classifierResult.reply,
        ticket: null,
        lead: null,
        pendingContact: null,
        handoffStatus: "none",
        estimatedWaitMinutes: null,
      };
    }
    category = classifierResult.category;
    await supabase.from("conversations").update({ sales_category: category }).eq("id", conversationId);
  }

  if (state.contactConfirmed && state.handoffStatus === "none" && (await getWorkingHours())) {
    return queueForHandoff(conversationId);
  }

  const { reply, lead, pendingContact } = await runSalesAgentTurn(history, category, state.contactConfirmed);

  if (pendingContact) {
    await supabase
      .from("conversations")
      .update({
        customer_name: pendingContact.name,
        customer_email: pendingContact.email,
        customer_phone: pendingContact.phone,
        customer_address: pendingContact.address,
        customer_postcode: pendingContact.postcode,
        customer_is_account_holder: pendingContact.isAccountHolder,
      })
      .eq("id", conversationId);

    const confirmationText = formatContactConfirmation(pendingContact);
    await insertMessage(conversationId, "assistant", confirmationText);
    return {
      reply: confirmationText,
      ticket: null,
      lead: null,
      pendingContact,
      handoffStatus: "none",
      estimatedWaitMinutes: null,
    };
  }

  const createdLead = lead ? await createLeadForConversation(conversationId, lead) : null;

  // The contact-date promise is a deterministic template, not left to the
  // model - see formatLeadContactPromise. Appended to the agent's own
  // confirmation reply so the customer sees one combined message.
  const finalReply = createdLead ? `${reply}\n\n${formatLeadContactPromise()}` : reply;

  if (finalReply) {
    await insertMessage(conversationId, "assistant", finalReply);
  }

  return {
    reply: finalReply,
    ticket: null,
    lead: createdLead,
    pendingContact: null,
    handoffStatus: "none",
    estimatedWaitMinutes: null,
  };
}

export interface ContactActionResult {
  reply: string;
  ticket: Record<string, unknown> | null;
  lead: Record<string, unknown> | null;
  handoffStatus: HandoffStatus;
  estimatedWaitMinutes: number | null;
}

async function finalizeContact(
  conversationId: string,
  confirmationMessage: string
): Promise<ContactActionResult> {
  await supabase.from("conversations").update({ contact_confirmed: true }).eq("id", conversationId);

  // Represented as a real user turn (not a second assistant message) so the
  // conversation keeps alternating properly - otherwise the next Claude call
  // sees two assistant turns in a row with nothing to respond to.
  await insertMessage(conversationId, "user", confirmationMessage);

  const { reply, ticket, lead, handoffStatus, estimatedWaitMinutes } = await runAndPersistTurn(conversationId);
  return { reply, ticket, lead, handoffStatus, estimatedWaitMinutes };
}

/** Customer clicked "Yes" on the auto-detected confirmation card. */
export async function confirmPendingContact(
  conversationId: string
): Promise<ContactActionResult | { error: string }> {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select(
      "customer_name, customer_email, customer_phone, customer_address, customer_postcode, customer_is_account_holder, contact_confirmed"
    )
    .eq("id", conversationId)
    .single();
  if (error || !conversation) return { error: "Conversation not found" };
  if (conversation.contact_confirmed) return { error: "Contact details are already confirmed" };

  const candidate = {
    name: conversation.customer_name ?? undefined,
    email: conversation.customer_email ?? undefined,
    phone: conversation.customer_phone ?? undefined,
    address: conversation.customer_address ?? undefined,
    postcode: conversation.customer_postcode ?? undefined,
    isAccountHolder: conversation.customer_is_account_holder ?? undefined,
  };
  const validationError = validateContactDetails(candidate);
  if (validationError) return { error: validationError };

  return finalizeContact(conversationId, "Yes, that's correct.");
}

/** Customer clicked "Edit" and submitted the correction form. */
export async function overwriteContact(
  conversationId: string,
  input: Partial<ContactDetails>
): Promise<ContactActionResult | { error: string }> {
  const validationError = validateContactDetails(input);
  if (validationError) return { error: validationError };

  const contact = {
    name: input.name!.trim(),
    email: input.email!.trim(),
    phone: input.phone!.trim(),
    address: input.address!.trim(),
    postcode: input.postcode!.trim(),
    isAccountHolder: input.isAccountHolder!,
  };

  await supabase
    .from("conversations")
    .update({
      customer_name: contact.name,
      customer_email: contact.email,
      customer_phone: contact.phone,
      customer_address: contact.address,
      customer_postcode: contact.postcode,
      customer_is_account_holder: contact.isAccountHolder,
    })
    .eq("id", conversationId);

  return finalizeContact(
    conversationId,
    `Actually, here are my correct details - Name: ${contact.name}, Email: ${contact.email}, ` +
      `Phone: ${contact.phone}, Address: ${contact.address}, Postcode: ${contact.postcode}, ` +
      `Account holder: ${contact.isAccountHolder ? "Yes" : "No"}.`
  );
}

export interface QueueEntry {
  id: string;
  mode: ChatMode;
  customer_name: string | null;
  queued_at: string | null;
  estimated_wait_minutes: number | null;
}

/** Conversations currently waiting for a staff member, for the dashboard's queue panel. */
export async function listQueuedConversations(): Promise<QueueEntry[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, mode, customer_name, queued_at, estimated_wait_minutes")
    .eq("handoff_status", "queued")
    .order("queued_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((entry) => ({ ...entry, mode: (entry.mode as ChatMode) ?? "support" }));
}

/**
 * Re-drafts the ticket summary from the full history and stores it, so a
 * staff member's polling picks up new details the customer just gave -
 * called whenever a customer message arrives while the conversation is
 * live. Never overwrites the stored draft with a `null` result (an empty
 * history can't happen here, but keeps this safe either way).
 */
async function updateDraftTicket(conversationId: string): Promise<CreateTicketArgs | null> {
  const history = await loadHistory(conversationId);
  const draftTicket = await draftTicketSummary(history);
  if (draftTicket) {
    await supabase.from("conversations").update({ draft_ticket: draftTicket }).eq("id", conversationId);
  }
  return draftTicket;
}

/** Sales-mode counterpart to updateDraftTicket - re-drafts the lead summary. */
async function updateDraftLead(conversationId: string, category: SalesCategory): Promise<CreateLeadArgs | null> {
  const history = await loadHistory(conversationId);
  const draftLead = await draftLeadSummary(history, category);
  if (draftLead) {
    await supabase.from("conversations").update({ draft_lead: draftLead }).eq("id", conversationId);
  }
  return draftLead;
}

export interface ConversationMessagesResult {
  handoffStatus: HandoffStatus;
  estimatedWaitMinutes: number | null;
  draftTicket: CreateTicketArgs | null;
  draftLead: CreateLeadArgs | null;
  messages: StoredMessage[];
}

/** Polling endpoint backing both the customer chat and the staff chat window. */
export async function getConversationMessages(
  conversationId: string
): Promise<ConversationMessagesResult | { error: string }> {
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("handoff_status, estimated_wait_minutes, draft_ticket, draft_lead")
    .eq("id", conversationId)
    .single();
  if (convError || !conversation) return { error: "Conversation not found" };

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (messagesError) throw messagesError;

  return {
    handoffStatus: (conversation.handoff_status as HandoffStatus) ?? "none",
    estimatedWaitMinutes: conversation.estimated_wait_minutes ?? null,
    draftTicket: (conversation.draft_ticket as CreateTicketArgs | null) ?? null,
    draftLead: (conversation.draft_lead as CreateLeadArgs | null) ?? null,
    messages: messages ?? [],
  };
}

export interface StaffJoinResult {
  mode: ChatMode;
  draftTicket: CreateTicketArgs | null;
  draftLead: CreateLeadArgs | null;
  messages: StoredMessage[];
}

/** Staff clicked "Join" on a queued conversation in the dashboard. */
export async function staffJoinConversation(
  conversationId: string
): Promise<StaffJoinResult | { error: string }> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("handoff_status, mode, sales_category")
    .eq("id", conversationId)
    .single();
  if (!conversation || conversation.handoff_status !== "queued") {
    return { error: "Conversation is not currently queued" };
  }

  await supabase
    .from("conversations")
    .update({ handoff_status: "live", staff_joined_at: new Date().toISOString() })
    .eq("id", conversationId);

  const mode = (conversation.mode as ChatMode) ?? "support";
  const salesCategory = conversation.sales_category as SalesCategory | null;

  const draftTicket = mode === "support" ? await updateDraftTicket(conversationId) : null;
  const draftLead = mode === "sales" && salesCategory ? await updateDraftLead(conversationId, salesCategory) : null;

  const result = await getConversationMessages(conversationId);
  if ("error" in result) return result;

  return { mode, draftTicket, draftLead, messages: result.messages };
}

/** Staff member typed a reply while live with a customer. */
export async function sendStaffMessage(
  conversationId: string,
  content: string
): Promise<StoredMessage | { error: string }> {
  const state = await loadConversationState(conversationId);
  if (state.handoffStatus !== "live") {
    return { error: "Conversation is not currently in a live handoff" };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role: "staff", content })
    .select("id, role, content")
    .single();
  if (error) throw error;

  return data as StoredMessage;
}

/** Staff clicked "Issue resolved" - drafts resolution notes for them to review. */
export async function draftResolution(conversationId: string): Promise<{ resolution: string | null }> {
  const history = await loadHistory(conversationId);
  const resolution = await draftResolutionSummary(history);
  return { resolution };
}
