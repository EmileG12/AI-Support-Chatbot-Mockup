import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("./supabaseClient.js", async () => {
  const mock = await import("./test/supabaseMock.js");
  return { supabase: mock.supabase };
});

import { supabase, queueResult, resetSupabaseMock } from "./test/supabaseMock.js";
import { getWorkingHours, setWorkingHours } from "./settings.js";

beforeEach(() => {
  resetSupabaseMock();
});

describe("getWorkingHours", () => {
  it("returns the stored value", async () => {
    queueResult({ data: { value: true }, error: null });

    expect(await getWorkingHours()).toBe(true);
  });

  it("defaults to false when the row is missing", async () => {
    queueResult({ data: null, error: null });

    expect(await getWorkingHours()).toBe(false);
  });
});

describe("setWorkingHours", () => {
  it("updates the working_hours row", async () => {
    queueResult({ data: null, error: null });

    await setWorkingHours(true);

    const chain = supabase.from.mock.results[0].value as {
      update: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
    };
    expect(chain.update).toHaveBeenCalledWith({ value: true });
    expect(chain.eq).toHaveBeenCalledWith("key", "working_hours");
  });
});
