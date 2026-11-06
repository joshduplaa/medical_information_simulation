import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { Role } from "../api";
import { useAuth } from "./AuthContext";
import { ErrorState } from "../components/PageState";

/**
 * Client-side route guard. This is a UX convenience only — the API enforces the same roles on every request,
 * so a user who edits the client still cannot read or change data they are not allowed to.
 */
export function RequireRole({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, signedOut } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={signedOut ? undefined : { from: location.pathname }} />;
  if (role && user.role !== role) return <ErrorState title="Not available for your role" message={`This page is for ${role} accounts.`} />;
  return <>{children}</>;
}
