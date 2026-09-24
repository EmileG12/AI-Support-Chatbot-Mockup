import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { supabase } from "./supabaseClient.js";
import { runAgentTurn, type CreateTicketArgs } from "./ticketAgent.js";
import { findPossibleDuplicateTicket } from "./duplicates.js";
import { validateContactDetails, type ContactDetails } from "./contactValidation.js";

export function formatContactConfirmation(contact: ContactDetails): string {
  return (
    `Just to confirm, that's:\nName: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone}\n` +
    `Address: ${contact.address}\nPostcode: ${contact.postcode}\n` +
    `Account holder: ${contact.isAccountHolder ? "Yes" : "No"}\n\nIs that all correct?`
  );
}

async function loadHistory(conversationId: string): Promise<MessageParam[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
  }));
}

async function isContactConfirmed(conversationId: string): Promise<boolean> {
  const { data } = await supabase
    .from("conversations")
    .select("contact_confirmed")
    .eq("id", conversationId)
    .single();
  return data?.contact_confirmed ?? false;
}

async function insertMessage(conversationId: string, role: "user" | "assistant", content: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
}

export async function insertUserMessage(conversationId: string, content: string) {
  await insertMessage(conversationId, "user", content);
}

async function createTicketForConversation(conversationId: string, ticket: CreateTicketArgs) {
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

  const { data: ticketRow, error: ticketError } = await supabase
    .from("tickets")
    .insert({
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
      possible_duplicate_of: duplicate?.id ?? null,
      duplicate_similarity: duplicate?.similarity ?? null,
    })
    .select()
    .single();
  if (ticketError) throw ticketError;

  await supabase.from("conversations").update({ status: "resolved" }).eq("id", conversationId);

  return ticketRow;
}

export interface TurnResult {
  reply: string;
  ticket: Record<string, unknown> | null;
  pendingContact: ContactDetails | null;
}

/**
 * Loads history, runs one Claude turn, and persists whatever it produced (an
 * assistant reply, a new ticket, or a contact-details confirmation prompt).
 * Shared by POST /api/chat and the contact confirm/correct endpoints, since
 * all three need "run a turn against current conversation state and persist
 * the outcome."
 */
export async function runAndPersistTurn(conversationId: string): Promise<TurnResult> {
  const [history, contactConfirmed] = await Promise.all([
    loadHistory(conversationId),
    isContactConfirmed(conversationId),
  ]);
  const { reply, ticket, pendingContact } = await runAgentTurn(history, contactConfirmed);

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
    return { reply: confirmationText, ticket: null, pendingContact };
  }

  if (reply) {
    await insertMessage(conversationId, "assistant", reply);
  }

  const createdTicket = ticket ? await createTicketForConversation(conversationId, ticket) : null;

  return { reply, ticket: createdTicket, pendingContact: null };
}

export interface ContactActionResult {
  reply: string;
  ticket: Record<string, unknown> | null;
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

  const { reply, ticket } = await runAndPersistTurn(conversationId);
  return { reply, ticket };
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
