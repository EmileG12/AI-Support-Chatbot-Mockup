import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LogoutButton } from "./LogoutButton";

vi.mock("./api", () => ({
  logout: vi.fn(),
}));

import { logout } from "./api";

const mockLogout = vi.mocked(logout);

describe("LogoutButton", () => {
  it("logs out and navigates to /login", async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/staff"]}>
        <Routes>
          <Route path="/staff" element={<LogoutButton />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(mockLogout).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
  });
});
