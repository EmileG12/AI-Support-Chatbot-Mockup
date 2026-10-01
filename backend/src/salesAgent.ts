import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ContactDetails } from "./contactValidation.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const SALES_CATEGORIES = ["broadband", "mobile"] as const;
export type SalesCategory = (typeof SALES_CATEGORIES)[number];

export const LEAD_STATUSES = ["new", "contacted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface CreateLeadArgs {
  category: SalesCategory;
  plan_interested?: string;
  summary: string;
  raw_message: string;
}

const CLASSIFY_INTEREST_TOOL: Tool = {
  name: "classify_interest",
  description:
    "Record whether the customer is asking about broadband or mobile plans, as soon as it's clear from " +
    "what they've written. Do not call this if it's still genuinely ambiguous - ask a brief clarifying " +
    "question in that case instead.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: SALES_CATEGORIES as unknown as string[],
        description: "broadband: home/fibre internet plans. mobile: SIM-only mobile phone plans.",
      },
    },
    required: ["category"],
  },
};

const CLASSIFIER_SYSTEM_PROMPT = `You are the first point of contact for Fenmoor Telecom's sales chat.

Read the customer's message and decide whether they're interested in broadband (home/fibre internet) or mobile (SIM-only phone) plans, then call classify_interest with that category.

Only call the tool once you're confident from what they've actually said - don't guess. If their message doesn't make it clear which one they mean (e.g. "what deals do you have?" or "tell me about your plans"), don't call the tool - just ask, briefly and in one sentence, whether they're looking for broadband or a mobile plan.`;

export async function runSalesClassifierTurn(
  history: MessageParam[]
): Promise<{ reply: string; category: SalesCategory | null }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    system: CLASSIFIER_SYSTEM_PROMPT,
    tools: [CLASSIFY_INTEREST_TOOL],
    messages: history,
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const reply = textBlocks.map((b) => b.text).join("\n").trim();

  if (!toolUse) {
    return { reply, category: null };
  }

  const input = toolUse.input as { category: SalesCategory };
  return { reply, category: input.category };
}

const COLLECT_CONTACT_TOOL: Tool = {
  name: "collect_contact_details",
  description:
    "Record the customer's contact details once they've said they want to proceed (sign up, place an " +
    "order, or get a callback) and you have their name, email address, phone number, full address, " +
    "postcode, and whether they already have an account with us. Call this exactly once - do not call " +
    "it again after it succeeds, even if the customer keeps chatting.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The customer's full name." },
      email: { type: "string", description: "The customer's email address." },
      phone: { type: "string", description: "The customer's phone number." },
      address: { type: "string", description: "The customer's full address, excluding postcode." },
      postcode: { type: "string", description: "The customer's postcode." },
      is_account_holder: {
        type: "boolean",
        description: "True if the customer already has an account with us, false if they're a new customer.",
      },
    },
    required: ["name", "email", "phone", "address", "postcode", "is_account_holder"],
  },
};

const CREATE_LEAD_TOOL: Tool = {
  name: "create_lead",
  description:
    "Log a sales lead once contact details are confirmed and you know which plan the customer is " +
    "interested in. Call this exactly once per conversation - do not keep chatting after logging it.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: SALES_CATEGORIES as unknown as string[],
        description: "broadband or mobile - should match the conversation's classified category.",
      },
      plan_interested: {
        type: "string",
        description: "The specific plan name the customer settled on, if one was decided (e.g. 'Fast Fibre 220', 'Unlimited SIM'). Omit if they haven't picked a specific plan yet.",
      },
      summary: {
        type: "string",
        description: "One or two sentence internal summary of what the customer wants, for the sales team.",
      },
      raw_message: {
        type: "string",
        description: "The customer's original description of what they're looking for, in their own words.",
      },
    },
    required: ["category", "summary", "raw_message"],
  },
};

function toolsFor(contactConfirmed: boolean): Tool[] {
  return contactConfirmed ? [CREATE_LEAD_TOOL] : [COLLECT_CONTACT_TOOL];
}

const SALES_RULES = `Rules:
- Be brief, friendly and helpful. This is a text chat, not email - keep replies short.
- Only recommend plans and prices listed below - never invent a plan, speed, or price that isn't listed.
- Answer the customer's questions directly first. Only move towards signing them up once they show buying intent (e.g. "I'll take that one", "how do I sign up", "can you set that up for me").
- Once the customer wants to proceed: before going further, get their full name, email address, phone number, full address, postcode, and whether they already have an account with us - the sales team needs these to follow up. Once you have all of them, call collect_contact_details exactly once. A confirmation prompt is then shown to the customer outside of this chat, so you won't see it in the transcript - the next message you see from them will be exactly "Yes, that's correct." (confirming) or a message starting "Actually, here are my correct details - ..." (correcting). Either message means contact details are now fully settled - do NOT restate or re-ask to confirm the details yourself. Simply treat contact as done.
- Once contact is confirmed, call create_lead exactly once, then send one short confirmation message referencing the lead so the customer knows what happens next. Do not invent an ETA or promise a specific callback time.
- Never make up account details, order numbers, or account status - you only know what the customer tells you in this conversation.`;

const BROADBAND_SALES_SYSTEM_PROMPT = `You are a sales assistant for Fenmoor Telecom, a UK broadband and mobile provider. This customer has already told us they're interested in broadband.

Fenmoor Telecom's broadband plans (all Full Fibre/FTTP unless noted, prices per month):

1. Essential Fibre 40 - up to 38 Mbps download / 9 Mbps upload. Fibre to the Cabinet (FTTC), wireless router included. 24-month contract. £21.00/month. Good for everyday browsing, email and streaming on a few devices.
2. Plus Fibre 80 - up to 67 Mbps download / 17 Mbps upload. Hybrid ultrafast (SoGEA), wireless router included. 24-month contract. £23.00/month. Good for smoother streaming, video calls and a few more devices at once.
3. Fast Fibre 220 - up to 207 Mbps download / 29 Mbps upload. Full Fibre to the Premises (FTTP), AC wireless router included. 24-month contract. £33.00/month. Suits busy households streaming, gaming and on video calls at the same time.
4. Fast Fibre 330 - up to 311 Mbps download / 47 Mbps upload. Full Fibre (FTTP), AC wireless router included. 24-month contract. £33.00/month. Similar price to Fast Fibre 220 but faster - a good step up for larger households or heavier use.
5. Ultra Fibre 1000 - up to 944 Mbps download / 110 Mbps upload. Full Fibre (FTTP), AC wireless router included. 24-month contract. £36.00/month. Our fastest plan, for very large or multi-user households with heavy simultaneous use (multiple 4K streams, large downloads, gaming, working from home).
6. Student Fibre 115 (students only) - up to 109 Mbps download / 19 Mbps upload. Full Fibre (FTTP). Shorter 12-month contract to fit the academic year. £39.99/month. Only recommend this if the customer mentions they're a student.

Recommending: ask about household size and main use (browsing/streaming/gaming/working from home/number of devices) if it's not already clear, then suggest the plan that best fits - Essential/Plus Fibre for light use or fewer devices, Fast Fibre 220/330 for streaming-heavy or multi-device households, Ultra Fibre 1000 for the heaviest multi-user households, and Student Fibre for students who want a shorter contract.

${SALES_RULES}`;

const MOBILE_SALES_SYSTEM_PROMPT = `You are a sales assistant for Fenmoor Telecom, a UK broadband and mobile provider. This customer has already told us they're interested in mobile.

Fenmoor Telecom's mobile plans (SIM-only, on our partner mobile network, 12-month contracts, prices per month):

1. Lite SIM - 15GB of 4G/5G data. Unlimited UK calls & texts. Free EU roaming. £7.50/month. Good for light-to-moderate data users.
2. Unlimited SIM - Unlimited 4G/5G data. Unlimited UK calls & texts. Free EU roaming. £12.00/month. Good for heavy data users or anyone who doesn't want to think about a data cap.

Both plans: SIM-only (bring your own device - just swap in the new SIM, keep your existing number and phone), 5G and 4G compatible, 12-month contract, simple switching by texting PAC to your new provider.

Recommending: ask roughly how much data they use (or what they use their phone for - browsing/social media/streaming/hotspotting) if it's not already clear, then suggest Lite SIM for light-to-moderate use or Unlimited SIM for heavy use or anyone wanting no data-cap worries.

${SALES_RULES}`;

function systemPromptFor(category: SalesCategory): string {
  return category === "broadband" ? BROADBAND_SALES_SYSTEM_PROMPT : MOBILE_SALES_SYSTEM_PROMPT;
}

/**
 * Drafts a category/plan/summary from the conversation so far, for a staff
 * member joining a live sales handoff to read - not persisted, not a
 * conversational turn. Forces the create_lead tool (tool_choice) since we
 * just want the structured extraction, not a reply. Mirrors ticketAgent's
 * draftTicketSummary.
 */
export async function draftLeadSummary(
  history: MessageParam[],
  category: SalesCategory
): Promise<CreateLeadArgs | null> {
  if (history.length === 0) return null;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    system: systemPromptFor(category),
    tools: [CREATE_LEAD_TOOL],
    tool_choice: { type: "tool", name: "create_lead" },
    messages: history,
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return null;

  return toolUse.input as CreateLeadArgs;
}

export interface SalesAgentTurnResult {
  reply: string;
  lead: CreateLeadArgs | null;
  pendingContact: ContactDetails | null;
}

export async function runSalesAgentTurn(
  history: MessageParam[],
  category: SalesCategory,
  contactConfirmed: boolean
): Promise<SalesAgentTurnResult> {
  const system = systemPromptFor(category);
  const tools = toolsFor(contactConfirmed);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system,
    tools,
    messages: history,
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  let reply = textBlocks.map((b) => b.text).join("\n").trim();

  if (!toolUse) {
    return { reply, lead: null, pendingContact: null };
  }

  if (toolUse.name === "collect_contact_details") {
    const input = toolUse.input as {
      name: string;
      email: string;
      phone: string;
      address: string;
      postcode: string;
      is_account_holder: boolean;
    };
    const pendingContact: ContactDetails = {
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      postcode: input.postcode,
      isAccountHolder: input.is_account_holder,
    };
    return { reply: "", lead: null, pendingContact };
  }

  const lead = toolUse.input as CreateLeadArgs;

  const followUpHistory: MessageParam[] = [
    ...history,
    { role: "assistant", content: response.content },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Lead logged successfully. Category: ${lead.category}.`,
        },
      ],
    },
  ];

  const followUp = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    system,
    tools,
    messages: followUpHistory,
  });

  const followUpText = followUp.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  reply = followUpText.map((b) => b.text).join("\n").trim();

  return { reply, lead, pendingContact: null };
}
