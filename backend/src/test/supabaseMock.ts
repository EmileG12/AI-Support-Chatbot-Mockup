import { vi } from "vitest";

export interface SupabaseResult {
  data: unknown;
  error: unknown;
}

const queue: SupabaseResult[] = [];

function createChain() {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then: (
      resolve: (value: SupabaseResult) => void,
      reject: (reason: unknown) => void
    ) => {
      const next = queue.shift();
      if (!next) {
        reject(
          new Error(
            "supabaseMock: no queued result - call queueResult() before this call"
          )
        );
        return;
      }
      resolve(next);
    },
  };
  return chain;
}

/**
 * A chainable stand-in for the Supabase query builder. Each `.from(...)` call
 * consumes the next queued result, in call order - tests queue results in the
 * same sequence the code under test is expected to make Supabase calls.
 */
export const supabase = {
  from: vi.fn(() => createChain()),
  rpc: vi.fn(),
};

export function queueResult(result: SupabaseResult) {
  queue.push(result);
}

export function resetSupabaseMock() {
  queue.length = 0;
  supabase.from.mockClear();
  supabase.rpc.mockClear();
}
