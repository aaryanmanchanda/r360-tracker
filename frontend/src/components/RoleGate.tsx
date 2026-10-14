import type { ReactNode } from "react";
import { useAuth } from "../auth/useAuth";
import type { Role } from "../api/types";

//cosmetic only: hides actions this role can't do. the api returns 403 anyway, see backend/app/auth.py
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  return user?.role === role ? <>{children}</> : null;
}
