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
}));

import { fetchTickets, fetchTicketDetail, updateTicket } from "./api";

const mockFetchTickets = vi.mocked(fetchTickets);
const mockFetchTicketDetail = vi.mocked(fetchTicketDetail);
const mockUpdateTicket = vi.mocked(updateTicket);

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

  it("'View duplicate' loads the linked ticket into the detail panel", async () => {
    mockFetchTickets.mockResolvedValueOnce([makeTicket({ id: "t1", possible_duplicate_of: "t0" })]);
    mockFetchTicketDetail.mockResolvedValueOnce(
      makeDetail({
        ticket: makeTicket({ id: "t1", possible_duplicate_of: "t0", duplicate_similarity: 0.6 }),
        duplicateOf: { id: "t0", summary: "Original outage report" },
      })
    );
    mockFetchTicketDetail.mockResolvedValueOnce(
      makeDetail({
        ticket: makeTicket({ id: "t0", summary: "Original outage report" }),
        messages: [{ id: "m0", role: "user", content: "original message" }],
      })
    );
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband fault");
    await user.click(row);

    const banner = await screen.findByText(/Possibly a duplicate of ticket/);
    await user.click(within(banner.closest(".duplicate-banner")!).getByRole("button", { name: /view duplicate/i }));

    expect(mockFetchTicketDetail).toHaveBeenLastCalledWith("t0");
    expect(await screen.findByText("original message")).toBeInTheDocument();
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
});
