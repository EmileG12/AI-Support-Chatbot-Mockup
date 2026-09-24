import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffChatWindow } from "./StaffChatWindow";
import type { ChatMessage, DraftTicket } from "./types";

vi.mock("./api", () => ({
  getConversationMessages: vi.fn(),
  sendStaffMessage: vi.fn(),
  createTicketFromDraft: vi.fn(),
}));

import { getConversationMessages, sendStaffMessage, createTicketFromDraft } from "./api";

const mockGetConversationMessages = vi.mocked(getConversationMessages);
const mockSendStaffMessage = vi.mocked(sendStaffMessage);
const mockCreateTicketFromDraft = vi.mocked(createTicketFromDraft);

const DRAFT: DraftTicket = {
  category: "broadband_fault",
  priority: "high",
  summary: "Broadband outage reported.",
  raw_message: "my broadband is down",
};

const MESSAGES: ChatMessage[] = [{ id: "m1", role: "user", content: "my broadband is down" }];

beforeEach(() => {
  mockGetConversationMessages.mockReset();
  mockSendStaffMessage.mockReset();
  mockCreateTicketFromDraft.mockReset();
});

describe("StaffChatWindow", () => {
  it("shows the AI-drafted summary and the transcript so far", () => {
    render(
      <StaffChatWindow
        conversationId="c1"
        initialDraftTicket={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onTicketCreated={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Broadband outage reported.")).toBeInTheDocument();
    expect(screen.getByText("my broadband is down")).toBeInTheDocument();
  });

  it("sends a staff reply and appends it to the transcript", async () => {
    mockSendStaffMessage.mockResolvedValueOnce({ id: "m2", role: "staff", content: "Hi, I'm here to help" });
    const user = userEvent.setup();
    render(
      <StaffChatWindow
        conversationId="c1"
        initialDraftTicket={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onTicketCreated={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText(/reply to the customer/i), "Hi, I'm here to help");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(mockSendStaffMessage).toHaveBeenCalledWith("c1", "Hi, I'm here to help");
    expect(await screen.findByText("Hi, I'm here to help")).toBeInTheDocument();
  });

  it("creates a ticket from the (possibly edited) draft and notifies the parent", async () => {
    mockCreateTicketFromDraft.mockResolvedValueOnce({
      id: "99999999-8888-7777-6666-555555555555",
      conversation_id: "c1",
      category: "broadband_fault",
      priority: "urgent",
      summary: "Broadband outage - escalated.",
      status: "open",
      created_at: "2026-09-24T12:00:00Z",
      raw_message: "my broadband is down",
    });
    const onTicketCreated = vi.fn();
    const user = userEvent.setup();
    render(
      <StaffChatWindow
        conversationId="c1"
        initialDraftTicket={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onTicketCreated={onTicketCreated}
      />
    );

    await user.selectOptions(screen.getByLabelText("Priority"), "urgent");
    await user.click(screen.getByRole("button", { name: /create ticket/i }));

    expect(mockCreateTicketFromDraft).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ priority: "urgent" })
    );
    expect(await screen.findByText("Ticket #99999999 created.")).toBeInTheDocument();
    expect(onTicketCreated).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when 'Close' is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <StaffChatWindow
        conversationId="c1"
        initialDraftTicket={DRAFT}
        initialMessages={MESSAGES}
        onClose={onClose}
        onTicketCreated={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
