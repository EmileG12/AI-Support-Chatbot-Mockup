import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthGate from "./AuthGate";

vi.mock("./api", () => ({
  checkAuth: vi.fn(),
}));

import { checkAuth } from "./api";

const mockCheckAuth = vi.mocked(checkAuth);

function renderWithGate() {
  return render(
    <MemoryRouter initialEntries={["/staff"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<AuthGate />}>
          <Route path="/staff" element={<div>Protected staff page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("AuthGate", () => {
  it("renders the protected route once authenticated", async () => {
    mockCheckAuth.mockResolvedValueOnce(true);
    renderWithGate();

    expect(await screen.findByText("Protected staff page")).toBeInTheDocument();
  });

  it("redirects to /login when unauthenticated", async () => {
    mockCheckAuth.mockResolvedValueOnce(false);
    renderWithGate();

    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
    expect(screen.queryByText("Protected staff page")).not.toBeInTheDocument();
  });
});
