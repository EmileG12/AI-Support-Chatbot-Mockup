import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LeadsDashboard from "./LeadsDashboard";
import { makeLead } from "./test/fixtures";
import type { LeadDetail } from "./types";

vi.mock("./api", () => ({
  fetchLeads: vi.fn(),
  fetchLeadDetail: vi.fn(),
  updateLead: vi.fn(),
}));

import { fetchLeads, fetchLeadDetail, updateLead } from "./api";

const mockFetchLeads = vi.mocked(fetchLeads);
const mockFetchLeadDetail = vi.mocked(fetchLeadDetail);
const mockUpdateLead = vi.mocked(updateLead);

function renderDashboard() {
  return render(
    <MemoryRouter>
      <LeadsDashboard />
    </MemoryRouter>
  );
}

function findTableRow(text: string) {
  return within(screen.getByRole("table"))
    .findByText(text)
    .then((cell) => cell.closest("tr")!);
}

function makeDetail(overrides: Partial<LeadDetail> = {}): LeadDetail {
  return {
    lead: makeLead(),
    messages: [{ id: "m1", role: "user", content: "I'll take the 220 plan" }],
    ...overrides,
  };
}

beforeEach(() => {
  mockFetchLeads.mockReset();
  mockFetchLeadDetail.mockReset();
  mockUpdateLead.mockReset();
});

describe("LeadsDashboard", () => {
  it("loads leads on mount, defaulting to the 'new' status filter", async () => {
    mockFetchLeads.mockResolvedValueOnce([makeLead()]);
    renderDashboard();

    await waitFor(() =>
      expect(mockFetchLeads).toHaveBeenCalledWith({ status: "new", category: undefined })
    );
    const table = screen.getByRole("table");
    expect(await within(table).findByText("Broadband")).toBeInTheDocument();
    expect(within(table).getByText("#66666666")).toBeInTheDocument();
  });

  it("re-fetches with the new filter when a filter changes", async () => {
    mockFetchLeads.mockResolvedValue([]);
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => expect(mockFetchLeads).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText("Filter by category"), "mobile");

    await waitFor(() =>
      expect(mockFetchLeads).toHaveBeenLastCalledWith({ status: "new", category: "mobile" })
    );
  });

  it("loads and renders the transcript when a row is clicked", async () => {
    mockFetchLeads.mockResolvedValueOnce([makeLead({ id: "l1" })]);
    mockFetchLeadDetail.mockResolvedValueOnce(makeDetail());
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband");
    await user.click(row);

    expect(mockFetchLeadDetail).toHaveBeenCalledWith("l1");
    expect(await screen.findByText("I'll take the 220 plan")).toBeInTheDocument();
  });

  it("calls updateLead when the status select changes, and reflects the update", async () => {
    mockFetchLeads.mockResolvedValueOnce([makeLead({ id: "l1" })]);
    mockFetchLeadDetail.mockResolvedValueOnce(makeDetail());
    mockUpdateLead.mockResolvedValueOnce(makeLead({ id: "l1", status: "contacted" }));
    const user = userEvent.setup();
    renderDashboard();

    const row = await findTableRow("Broadband");
    await user.click(row);
    await screen.findByText("I'll take the 220 plan");

    await user.selectOptions(screen.getByLabelText("Status"), "contacted");

    expect(mockUpdateLead).toHaveBeenCalledWith("l1", { status: "contacted" });
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveValue("contacted"));
  });
});
