import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onUnauthorized, type Session, type UserProfile } from "../api";
import { tokenStore } from "../api/tokenStore";

interface AuthValue {
  user: UserProfile | null;
  signIn(username: string, password: string): Promise<UserProfile>;
  signOut(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => tokenStore.load());

  const signOut = useCallback(() => {
    tokenStore.clear();
    setSession(null);
  }, []);

  // If the API rejects the token (expired, key rotated) drop the session instead of showing errors everywhere.
  useEffect(() => {
    const unsubscribe = onUnauthorized(signOut);
    return () => {
      unsubscribe();
    };
  }, [signOut]);

  const signIn = useCallback(async (username: string, password: string) => {
    const next = await api.login(username, password);
    tokenStore.save(next);
    setSession(next);
    return next.user;
  }, []);

  const value = useMemo<AuthValue>(() => ({ user: session?.user ?? null, signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
