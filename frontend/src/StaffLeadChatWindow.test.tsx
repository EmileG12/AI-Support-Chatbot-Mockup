import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffLeadChatWindow } from "./StaffLeadChatWindow";
import type { ChatMessage, DraftLead } from "./types";

vi.mock("./api", () => ({
  getConversationMessages: vi.fn(),
  sendStaffMessage: vi.fn(),
  createLeadFromDraft: vi.fn(),
}));

import { getConversationMessages, sendStaffMessage, createLeadFromDraft } from "./api";

const mockGetConversationMessages = vi.mocked(getConversationMessages);
const mockSendStaffMessage = vi.mocked(sendStaffMessage);
const mockCreateLeadFromDraft = vi.mocked(createLeadFromDraft);

const DRAFT: DraftLead = {
  category: "broadband",
  summary: "Wants a faster broadband plan.",
  raw_message: "I want faster broadband",
};

const MESSAGES: ChatMessage[] = [{ id: "m1", role: "user", content: "I want faster broadband" }];

beforeEach(() => {
  mockGetConversationMessages.mockReset().mockResolvedValue({
    handoffStatus: "live",
    estimatedWaitMinutes: null,
    draftTicket: null,
    draftLead: null,
    messages: MESSAGES,
  });
  mockSendStaffMessage.mockReset();
  mockCreateLeadFromDraft.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("StaffLeadChatWindow", () => {
  it("shows the AI-drafted summary and the transcript so far", () => {
    render(
      <StaffLeadChatWindow
        conversationId="c2"
        initialDraftLead={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onLeadCreated={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Wants a faster broadband plan.")).toBeInTheDocument();
    expect(screen.getByText("I want faster broadband")).toBeInTheDocument();
  });

  it("sends a staff reply and appends it to the transcript", async () => {
    mockSendStaffMessage.mockResolvedValueOnce({ id: "m2", role: "staff", content: "Hi, how can I help?" });
    const user = userEvent.setup();
    render(
      <StaffLeadChatWindow
        conversationId="c2"
        initialDraftLead={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onLeadCreated={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText(/reply to the customer/i), "Hi, how can I help?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(mockSendStaffMessage).toHaveBeenCalledWith("c2", "Hi, how can I help?");
    expect(await screen.findByText("Hi, how can I help?")).toBeInTheDocument();
  });

  it("creates a lead from the (possibly edited) draft and notifies the parent", async () => {
    mockCreateLeadFromDraft.mockResolvedValueOnce({
      id: "99999999-8888-7777-6666-555555555555",
      conversation_id: "c2",
      category: "broadband",
      plan_interested: "Fast Fibre 220",
      summary: "Wants a faster broadband plan.",
      status: "new",
      created_at: "2026-09-27T12:00:00Z",
      raw_message: "I want faster broadband",
    });
    const onLeadCreated = vi.fn();
    const user = userEvent.setup();
    render(
      <StaffLeadChatWindow
        conversationId="c2"
        initialDraftLead={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onLeadCreated={onLeadCreated}
      />
    );

    await user.type(screen.getByLabelText("Plan interested"), "Fast Fibre 220");
    await user.click(screen.getByRole("button", { name: /create lead/i }));

    expect(mockCreateLeadFromDraft).toHaveBeenCalledWith(
      "c2",
      expect.objectContaining({ plan_interested: "Fast Fibre 220" })
    );
    expect(await screen.findByText("Lead #99999999 created.")).toBeInTheDocument();
    expect(onLeadCreated).toHaveBeenCalledTimes(1);
  });

  it("holds a re-drafted summary for approval instead of overwriting a staff edit", async () => {
    // Immediate poll on mount: nothing new yet.
    mockGetConversationMessages.mockReset().mockResolvedValueOnce({
      handoffStatus: "live",
      estimatedWaitMinutes: null,
      draftTicket: null,
      draftLead: null,
      messages: MESSAGES,
    });
    render(
      <StaffLeadChatWindow
        conversationId="c2"
        initialDraftLead={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onLeadCreated={vi.fn()}
      />
    );
    // Let the immediate no-op poll settle before editing, so it can't race the edit below.
    await screen.findByDisplayValue("Wants a faster broadband plan.");

    // Staff edits the summary...
    fireEvent.change(screen.getByDisplayValue("Wants a faster broadband plan."), {
      target: { value: "Staff's own summary of the lead." },
    });

    // ...then the next poll (after a customer reply) brings a re-draft that conflicts with it.
    mockGetConversationMessages.mockResolvedValue({
      handoffStatus: "live",
      estimatedWaitMinutes: null,
      draftTicket: null,
      draftLead: { ...DRAFT, summary: "Now also wants a mobile plan." },
      messages: MESSAGES,
    });

    // Timeout > the 2.5s poll interval, since this only appears once the next tick fires.
    expect(await screen.findByText(/AI suggests an update/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Staff's own summary of the lead.")).toBeInTheDocument();
    expect(screen.getByText("Now also wants a mobile plan.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /use ai update/i }));

    expect(screen.getByDisplayValue("Now also wants a mobile plan.")).toBeInTheDocument();
    expect(screen.queryByText(/AI suggests an update/i)).not.toBeInTheDocument();
  }, 8000);

  it("calls onClose when 'Close' is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <StaffLeadChatWindow
        conversationId="c2"
        initialDraftLead={DRAFT}
        initialMessages={MESSAGES}
        onClose={onClose}
        onLeadCreated={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
