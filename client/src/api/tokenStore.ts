const KEY = "mis.session";

import type { Session } from "./types";

/** Persists the session (JWT + profile) in localStorage so a page refresh keeps you signed in. */
export const tokenStore = {
  load(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as Session;
      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },
  save(session: Session) {
    try {
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable (private mode): session lasts for this tab only */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
  token(): string | null {
    return this.load()?.token ?? null;
  },
};
