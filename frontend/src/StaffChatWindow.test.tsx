import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffChatWindow } from "./StaffChatWindow";
import type { ChatMessage, DraftTicket } from "./types";

vi.mock("./api", () => ({
  getConversationMessages: vi.fn(),
  sendStaffMessage: vi.fn(),
  createTicketFromDraft: vi.fn(),
  draftResolution: vi.fn(),
  resolveTicketFromDraft: vi.fn(),
}));

import {
  getConversationMessages,
  sendStaffMessage,
  createTicketFromDraft,
  draftResolution,
  resolveTicketFromDraft,
} from "./api";

const mockGetConversationMessages = vi.mocked(getConversationMessages);
const mockSendStaffMessage = vi.mocked(sendStaffMessage);
const mockCreateTicketFromDraft = vi.mocked(createTicketFromDraft);
const mockDraftResolution = vi.mocked(draftResolution);
const mockResolveTicketFromDraft = vi.mocked(resolveTicketFromDraft);

const DRAFT: DraftTicket = {
  category: "broadband_fault",
  priority: "high",
  summary: "Broadband outage reported.",
  raw_message: "my broadband is down",
};

const MESSAGES: ChatMessage[] = [{ id: "m1", role: "user", content: "my broadband is down" }];

beforeEach(() => {
  mockGetConversationMessages.mockReset().mockResolvedValue({
    handoffStatus: "live",
    estimatedWaitMinutes: null,
    draftTicket: null,
    messages: MESSAGES,
  });
  mockSendStaffMessage.mockReset();
  mockCreateTicketFromDraft.mockReset();
  mockDraftResolution.mockReset();
  mockResolveTicketFromDraft.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
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

  it("drafts a resolution, lets staff edit it, and resolves the ticket on accept", async () => {
    mockDraftResolution.mockResolvedValueOnce({
      resolution: "Resolved after a router reset confirmed by the customer.",
    });
    mockResolveTicketFromDraft.mockResolvedValueOnce({
      id: "88888888-7777-6666-5555-444444444444",
      conversation_id: "c1",
      category: "broadband_fault",
      priority: "high",
      summary: "Broadband outage reported.",
      status: "resolved",
      created_at: "2026-09-24T12:00:00Z",
      raw_message: "my broadband is down",
      resolution_notes: "Resolved after a router reset - confirmed by the customer, edited.",
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

    await user.click(screen.getByRole("button", { name: /issue resolved/i }));

    expect(mockDraftResolution).toHaveBeenCalledWith("c1");
    const resolutionBox = await screen.findByDisplayValue(
      "Resolved after a router reset confirmed by the customer."
    );

    // Staff tweaks the drafted wording before accepting.
    fireEvent.change(resolutionBox, {
      target: { value: "Resolved after a router reset - confirmed by the customer, edited." },
    });

    await user.click(screen.getByRole("button", { name: /accept & resolve ticket/i }));

    expect(mockResolveTicketFromDraft).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ summary: "Broadband outage reported." }),
      "Resolved after a router reset - confirmed by the customer, edited."
    );
    expect(await screen.findByText("Ticket #88888888 created and resolved.")).toBeInTheDocument();
    expect(onTicketCreated).toHaveBeenCalledTimes(1);
  });

  it("cancelling the resolution review goes back to the normal draft buttons", async () => {
    mockDraftResolution.mockResolvedValueOnce({ resolution: "Draft resolution text." });
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

    await user.click(screen.getByRole("button", { name: /issue resolved/i }));
    await screen.findByDisplayValue("Draft resolution text.");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByDisplayValue("Draft resolution text.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create ticket/i })).toBeInTheDocument();
    expect(mockResolveTicketFromDraft).not.toHaveBeenCalled();
  });

  it("auto-applies a re-drafted summary when staff hasn't made any manual edits", async () => {
    mockGetConversationMessages.mockReset().mockResolvedValueOnce({
      handoffStatus: "live",
      estimatedWaitMinutes: null,
      draftTicket: { ...DRAFT, summary: "Broadband outage - now also affecting the landline." },
      messages: MESSAGES,
    });
    render(
      <StaffChatWindow
        conversationId="c1"
        initialDraftTicket={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onTicketCreated={vi.fn()}
      />
    );

    expect(
      await screen.findByDisplayValue("Broadband outage - now also affecting the landline.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/AI suggests an update/i)).not.toBeInTheDocument();
  });

  it("holds a re-drafted summary for approval instead of overwriting a staff edit", async () => {
    // Immediate poll on mount: nothing new yet.
    mockGetConversationMessages
      .mockReset()
      .mockResolvedValueOnce({ handoffStatus: "live", estimatedWaitMinutes: null, draftTicket: null, messages: MESSAGES });
    render(
      <StaffChatWindow
        conversationId="c1"
        initialDraftTicket={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onTicketCreated={vi.fn()}
      />
    );
    // Let the immediate no-op poll settle before editing, so it can't race the edit below.
    await screen.findByDisplayValue("Broadband outage reported.");

    // Staff edits the summary...
    fireEvent.change(screen.getByDisplayValue("Broadband outage reported."), {
      target: { value: "Staff's own summary of the issue." },
    });

    // ...then the next poll (after a customer reply) brings a re-draft that conflicts with it.
    mockGetConversationMessages.mockResolvedValue({
      handoffStatus: "live",
      estimatedWaitMinutes: null,
      draftTicket: { ...DRAFT, summary: "Broadband outage - now also affecting the landline." },
      messages: MESSAGES,
    });

    // The re-drafted suggestion is held for review, not applied over the edit.
    // Timeout > the 2.5s poll interval, since this only appears once the next tick fires.
    expect(await screen.findByText(/AI suggests an update/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Staff's own summary of the issue.")).toBeInTheDocument();
    expect(screen.getByText("Broadband outage - now also affecting the landline.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /use ai update/i }));

    expect(
      screen.getByDisplayValue("Broadband outage - now also affecting the landline.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/AI suggests an update/i)).not.toBeInTheDocument();
  }, 8000);

  it("keeps a staff edit when the AI suggestion is dismissed", async () => {
    mockGetConversationMessages
      .mockReset()
      .mockResolvedValueOnce({ handoffStatus: "live", estimatedWaitMinutes: null, draftTicket: null, messages: MESSAGES });
    render(
      <StaffChatWindow
        conversationId="c1"
        initialDraftTicket={DRAFT}
        initialMessages={MESSAGES}
        onClose={vi.fn()}
        onTicketCreated={vi.fn()}
      />
    );
    await screen.findByDisplayValue("Broadband outage reported.");

    fireEvent.change(screen.getByDisplayValue("Broadband outage reported."), {
      target: { value: "Staff's own summary of the issue." },
    });

    mockGetConversationMessages.mockResolvedValue({
      handoffStatus: "live",
      estimatedWaitMinutes: null,
      draftTicket: { ...DRAFT, summary: "Broadband outage - now also affecting the landline." },
      messages: MESSAGES,
    });
    await screen.findByText(/AI suggests an update/i, {}, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /keep my edits/i }));

    expect(screen.getByDisplayValue("Staff's own summary of the issue.")).toBeInTheDocument();
    expect(screen.queryByText(/AI suggests an update/i)).not.toBeInTheDocument();
  }, 8000);

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
