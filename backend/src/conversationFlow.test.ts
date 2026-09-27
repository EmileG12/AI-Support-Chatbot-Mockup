import { describe, it, expect, vi } from "vitest";

vi.mock("./supabaseClient.js", async () => {
  const mock = await import("./test/supabaseMock.js");
  return { supabase: mock.supabase };
});

import { formatLeadContactPromise } from "./conversationFlow.js";

describe("formatLeadContactPromise", () => {
  it("mentions a date between 7 and 12 days from now", () => {
    const now = new Date();
    const text = formatLeadContactPromise();

    expect(text).toContain("A member of our sales team will be in touch by");

    const match = text.match(/by (.+) to get everything set up\.$/);
    expect(match).not.toBeNull();
    const parsedDate = new Date(match![1]);
    expect(Number.isNaN(parsedDate.getTime())).toBe(false);

    const diffDays = Math.round((parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(7);
    expect(diffDays).toBeLessThanOrEqual(12);
  });
});
