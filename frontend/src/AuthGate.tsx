import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { checkAuth } from "./api";

export default function AuthGate() {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    checkAuth().then((authenticated) => {
      if (!cancelled) setStatus(authenticated ? "authenticated" : "unauthenticated");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") return null;
  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
