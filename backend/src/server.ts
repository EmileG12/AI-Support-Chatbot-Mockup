import "dotenv/config";
import express from "express";
import cors from "cors";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { supabase } from "./supabaseClient.js";
import { runAgentTurn } from "./ticketAgent.js";

const app = express();
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Fenmoor Telecom chat backend listening on http://localhost:${port}`);
});
