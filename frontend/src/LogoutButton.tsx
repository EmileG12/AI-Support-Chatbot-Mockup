import { useNavigate } from "react-router-dom";
import { logout } from "./api";

export function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <button type="button" className="nav-link logout-link" onClick={handleLogout}>
      Log out
    </button>
  );
}
