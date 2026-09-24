import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StaffDashboard from "./StaffDashboard";
import { makeTicket } from "./test/fixtures";
import type { TicketDetail } from "./types";

vi.mock("./api", () => ({
  fetchTickets: vi.fn(),
  fetchTicketDetail: vi.fn(),
  updateTicket: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getQueue: vi.fn(),
  staffJoin: vi.fn(),
  sendStaffMessage: vi.fn(),
  createTicketFromDraft: vi.fn(),
  getConversationMessages: vi.fn(),
}));

import { fetchTickets, fetchTicketDetail, updateTicket, getSettings, updateSettings, getQueue, staffJoin } from "./api";

const mockFetchTickets = vi.mocked(fetchTickets);
const mockFetchTicketDetail = vi.mocked(fetchTicketDetail);
const mockUpdateTicket = vi.mocked(updateTicket);
const mockGetSettings = vi.mocked(getSettings);
const mockUpdateSettings = vi.mocked(updateSettings);
const mockGetQueue = vi.mocked(getQueue);
const mockStaffJoin = vi.mocked(staffJoin);

function renderDashboard() {
  return render(
    <MemoryRouter>
      <StaffDashboard />
    </MemoryRouter>
  );
}

function findTableRow(text: string) {
  return within(screen.getByRole("table"))
    .findByText(text)
    .then((cell) => cell.closest("tr")!);
}

function makeDetail(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    ticket: makeTicket(),
    messages: [{ id: "m1", role: "user", content: "my broadband is down" }],
    duplicateOf: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockFetchTickets.mockReset();
  mockFetchTicketDetail.mockReset();
  mockUpdateTicket.mockReset();
  mockGetSettings.mockReset().mockResolvedValue({ workingHours: false });
  mockUpdateSettings.mockReset().mockImplementation((s) => Promise.resolve(s));
  mockGetQueue.mockReset().mockResolvedValue([]);
  mockStaffJoin.mockReset();
});

describe("StaffDashboard", () => {
  it("loads tickets on mount, defaulting to the 'open' status filter", async () => {
    mockFetchTickets.mockResolvedValueOnce([makeTicket()]);
    renderDashboard();

    await waitFor(() =>
      expect(mockFetchTickets).toHaveBeenCalledWith({
        status: "open",
        category: undefined,
        priority: undefined,
      })
    );
    const table = screen.getByRole("table");
    expect(await within(table).findByText("Broadband fault")).toBeInTheDocument();
    expect(within(table).getByText("#11111111")).toBeInTheDocument();
  });

  it("re-fetches with the new filter when a filter changes", async () => {
    mockFetchTickets.mockResolvedValue([]);
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => expect(mockFetchTickets).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText("Filter by category"), "billing");

    await waitFor(() =>
      expect(mockFetchTickets).toHaveBeenLastCalledWith({
        status: "open",
        category: "billing",
        priority: undefined,
      })
    );
  });

  it("loads and renders the transcript when a row is clicked", async () => {
    mockFetchTickets.mockResolvedValueOnce([makeTicket({ id: "t1" })]);
    mockFetchTicketDetail.mockResolvedValueOnce(makeDetail());
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband fault");
    await user.click(row);

    expect(mockFetchTicketDetail).toHaveBeenCalledWith("t1");
    expect(await screen.findByText("my broadband is down")).toBeInTheDocument();
  });

  it("calls updateTicket when the priority select changes, and reflects the update", async () => {
    mockFetchTickets.mockResolvedValueOnce([makeTicket({ id: "t1" })]);
    mockFetchTicketDetail.mockResolvedValueOnce(makeDetail());
    mockUpdateTicket.mockResolvedValueOnce(makeTicket({ id: "t1", priority: "low" }));
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband fault");
    await user.click(row);
    await screen.findByText("my broadband is down");

    await user.selectOptions(screen.getByLabelText("Priority"), "low");

    expect(mockUpdateTicket).toHaveBeenCalledWith("t1", { priority: "low" });
    await waitFor(() => expect(screen.getByLabelText("Priority")).toHaveValue("low"));
  });

  it("shows the duplicate banner and closes the ticket as a duplicate", async () => {
    mockFetchTickets.mockResolvedValueOnce([makeTicket({ id: "t1", possible_duplicate_of: "t0" })]);
    mockFetchTicketDetail.mockResolvedValueOnce(
      makeDetail({
        ticket: makeTicket({ id: "t1", possible_duplicate_of: "t0", duplicate_similarity: 0.6 }),
        duplicateOf: { id: "t0", summary: "Original outage report" },
      })
    );
    mockUpdateTicket.mockResolvedValueOnce(makeTicket({ id: "t1", status: "closed" }));
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband fault");
    await user.click(row);

    const banner = await screen.findByText(/Possibly a duplicate of ticket/);
    expect(banner.textContent).toContain("Original outage report");
    expect(banner.textContent).toContain("60% similar");

    await user.click(within(banner.closest(".duplicate-banner")!).getByRole("button", { name: /close as duplicate/i }));

    expect(mockUpdateTicket).toHaveBeenCalledWith("t1", { status: "closed" });
  });

  it("'View duplicate' shows the linked ticket's full detail alongside the current one, without navigating away", async () => {
    mockFetchTickets.mockResolvedValueOnce([makeTicket({ id: "t1", possible_duplicate_of: "t0" })]);
    mockFetchTicketDetail.mockResolvedValueOnce(
      makeDetail({
        ticket: makeTicket({ id: "t1", possible_duplicate_of: "t0", duplicate_similarity: 0.6 }),
        duplicateOf: { id: "t0", summary: "Original outage report" },
        messages: [{ id: "m1", role: "user", content: "my broadband is down" }],
      })
    );
    mockFetchTicketDetail.mockResolvedValueOnce(
      makeDetail({
        ticket: makeTicket({
          id: "99999999-8888-7777-6666-555555555555",
          summary: "Original outage report",
          customer_name: "Jane Doe",
        }),
        messages: [{ id: "m0", role: "user", content: "my broadband was already down yesterday" }],
      })
    );
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband fault");
    await user.click(row);
    await screen.findByText("my broadband is down");

    const banner = await screen.findByText(/Possibly a duplicate of ticket/);
    await user.click(within(banner.closest(".duplicate-banner")!).getByRole("button", { name: /view duplicate/i }));

    expect(mockFetchTicketDetail).toHaveBeenLastCalledWith("t0");
    // The duplicate's own full detail block - summary, contact, transcript - renders
    // alongside the current ticket...
    expect(await screen.findByText("Possible duplicate — Ticket #99999999")).toBeInTheDocument();
    expect(screen.getByText("Original outage report")).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText("my broadband was already down yesterday")).toBeInTheDocument();
    // ...and the current ticket's transcript is still showing - no navigation happened.
    expect(screen.getByText("my broadband is down")).toBeInTheDocument();

    // Toggling again hides it.
    await user.click(screen.getByRole("button", { name: /hide duplicate/i }));
    expect(screen.queryByText("Possible duplicate — Ticket #99999999")).not.toBeInTheDocument();
  });

  it("'Not a duplicate' dismisses the warning and the banner disappears", async () => {
    mockFetchTickets.mockResolvedValueOnce([makeTicket({ id: "t1", possible_duplicate_of: "t0" })]);
    mockFetchTicketDetail.mockResolvedValueOnce(
      makeDetail({
        ticket: makeTicket({ id: "t1", possible_duplicate_of: "t0", duplicate_similarity: 0.6 }),
        duplicateOf: { id: "t0", summary: "Original outage report" },
      })
    );
    mockUpdateTicket.mockResolvedValueOnce(
      makeTicket({ id: "t1", possible_duplicate_of: "t0", duplicate_dismissed: true })
    );
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband fault");
    await user.click(row);

    const banner = await screen.findByText(/Possibly a duplicate of ticket/);
    await user.click(within(banner.closest(".duplicate-banner")!).getByRole("button", { name: /not a duplicate/i }));

    expect(mockUpdateTicket).toHaveBeenCalledWith("t1", { duplicate_dismissed: true });
    await waitFor(() => expect(screen.queryByText(/Possibly a duplicate of ticket/)).not.toBeInTheDocument());
  });

  it("toggling 'Working hours' calls updateSettings", async () => {
    mockFetchTickets.mockResolvedValueOnce([]);
    mockGetSettings.mockResolvedValueOnce({ workingHours: false });
    const user = userEvent.setup();
    renderDashboard();

    const toggle = await screen.findByLabelText("Working hours");
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    expect(mockUpdateSettings).toHaveBeenCalledWith({ workingHours: true });
    expect(toggle).toBeChecked();
  });

  it("joining a queued conversation opens the live staff chat window", async () => {
    mockFetchTickets.mockResolvedValueOnce([]);
    mockGetQueue.mockResolvedValueOnce([
      { id: "c1", customer_name: "Jane Doe", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 3 },
    ]);
    mockStaffJoin.mockResolvedValueOnce({
      draftTicket: {
        category: "broadband_fault",
        priority: "high",
        summary: "Broadband outage reported.",
        raw_message: "my broadband is down",
      },
      messages: [{ id: "m1", role: "user", content: "my broadband is down" }],
    });
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole("button", { name: /join/i }));

    expect(mockStaffJoin).toHaveBeenCalledWith("c1");
    expect(await screen.findByText("Live chat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Broadband outage reported.")).toBeInTheDocument();
  });
});
