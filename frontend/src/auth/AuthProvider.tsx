import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "../api/client";
import type { User } from "../api/types";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(tokenStore.get() !== null); //no token = nothing to wait for
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tokenStore.get()) return;
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => tokenStore.clear()) //expired or tampered token, just treat as logged out
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } });
    tokenStore.set(res.token);
    setUser(res.user);
  }

  function logout() {
    tokenStore.clear();
    queryClient.clear(); //don't leak the last user's cached lists to the next login
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
