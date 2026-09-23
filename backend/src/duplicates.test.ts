import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("./supabaseClient.js", async () => {
  const mock = await import("./test/supabaseMock.js");
  return { supabase: mock.supabase };
});

import { supabase, resetSupabaseMock } from "./test/supabaseMock.js";
import { findPossibleDuplicateTicket } from "./duplicates.js";

describe("findPossibleDuplicateTicket", () => {
  beforeEach(() => {
    resetSupabaseMock();
  });

  it("returns the match when the RPC returns a row", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ id: "ticket-1", summary: "Broadband down", similarity: 0.6 }],
      error: null,
    });

    const result = await findPossibleDuplicateTicket("broadband_fault", "my broadband is down");

    expect(result).toEqual({ id: "ticket-1", summary: "Broadband down", similarity: 0.6 });
    expect(supabase.rpc).toHaveBeenCalledWith("find_possible_duplicate_ticket", {
      p_category: "broadband_fault",
      p_text: "my broadband is down",
    });
  });

  it("returns null when the RPC returns no rows", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await findPossibleDuplicateTicket("billing", "invoice question");

    expect(result).toBeNull();
  });

  it("returns null (not a throw) when the RPC errors", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("db unreachable") });

    const result = await findPossibleDuplicateTicket("mobile_fault", "no signal");

    expect(result).toBeNull();
  });
});
