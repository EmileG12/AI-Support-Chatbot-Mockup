import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement layout, so scrollIntoView isn't defined.
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
});
