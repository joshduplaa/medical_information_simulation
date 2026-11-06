import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onUnauthorized, type Session, type UserProfile } from "../api";
import { tokenStore } from "../api/tokenStore";

interface AuthValue {
  user: UserProfile | null;
  /** True after an explicit sign-out, so the next sign-in does not resume the previous user's page. */
  signedOut: boolean;
  signIn(username: string, password: string): Promise<UserProfile>;
  signOut(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => tokenStore.load());
  const [signedOut, setSignedOut] = useState(false);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setSignedOut(true);
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
    setSignedOut(false);
    setSession(next);
    return next.user;
  }, []);

  const value = useMemo<AuthValue>(() => ({ user: session?.user ?? null, signedOut, signIn, signOut }), [session, signedOut, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
