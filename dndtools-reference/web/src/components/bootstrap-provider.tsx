"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/auth/session";

/**
 * Client-side session bootstrap. Pages are static, so nothing about the viewer
 * is rendered on the server. The root BootstrapProvider fetches the session
 * nonce and the signed-in user once from POST /session on mount, then shares
 * them through context.
 *
 * Ready flags:
 * - sessionReady: the nonce is known, so server actions can be called.
 * - authReady: the user is known (signed in, or anonymous after retries ran out).
 */

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000];

type BootstrapPayload = { nonce: string; user: AuthUser | null };

type BootstrapState = {
  nonce: string;
  user: AuthUser | null;
  sessionReady: boolean;
  authReady: boolean;
};

type BootstrapContextValue = BootstrapState & {
  refresh: () => Promise<boolean>;
};

const BootstrapContext = createContext<BootstrapContextValue>({
  nonce: "",
  user: null,
  sessionReady: false,
  authReady: false,
  refresh: async () => false,
});

async function requestBootstrap(): Promise<BootstrapPayload | null> {
  try {
    const res = await fetch("/session", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<BootstrapPayload>;
    if (typeof data.nonce !== "string" || data.nonce === "") return null;
    return { nonce: data.nonce, user: data.user ?? null };
  } catch {
    return null;
  }
}

function redirectToLogin(): void {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

/** Mounted once, at the root layout. The only place that calls POST /session. */
export function BootstrapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootstrapState>({
    nonce: "",
    user: null,
    sessionReady: false,
    authReady: false,
  });

  // Concurrent callers share one request. Two parallel requests with no cookie
  // would mint two sessions, and the browser keeps only the last Set-Cookie.
  const inFlight = useRef<Promise<boolean> | null>(null);

  const refresh = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;

    const run = requestBootstrap()
      .then((payload) => {
        if (!payload) return false;
        setState({
          nonce: payload.nonce,
          user: payload.user,
          sessionReady: true,
          authReady: true,
        });
        return true;
      })
      .finally(() => {
        inFlight.current = null;
      });

    inFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retries = 0;

    const load = async () => {
      const ok = await refresh();
      if (cancelled || ok) return;

      if (retries < RETRY_DELAYS_MS.length) {
        retryTimer = setTimeout(load, RETRY_DELAYS_MS[retries]);
        retries += 1;
        return;
      }
      // Give up: treat the viewer as anonymous so the header stops waiting.
      // Server actions stay blocked until useRefreshSession succeeds.
      setState((prev) => ({ ...prev, authReady: true }));
    };

    void load();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [refresh]);

  const value = useMemo<BootstrapContextValue>(
    () => ({ ...state, refresh }),
    [state, refresh],
  );

  return (
    <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>
  );
}

/**
 * For server-gated subtrees. A layout that already resolved the user passes it
 * here, so the children get a non-null user on the first render. No second
 * request is made. If the root bootstrap later reports no session, the viewer
 * goes to login.
 */
export function ServerUserProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const parent = useContext(BootstrapContext);
  const sessionEnded = parent.sessionReady && parent.user === null;

  useEffect(() => {
    if (sessionEnded) redirectToLogin();
  }, [sessionEnded]);

  const value = useMemo<BootstrapContextValue>(
    () => ({ ...parent, user, authReady: true }),
    [parent, user],
  );

  return (
    <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>
  );
}

/** Session nonce for server actions. Empty until sessionReady. */
export function useSessionNonce(): string {
  return useContext(BootstrapContext).nonce;
}

/** True once the nonce is known and server actions can be called. */
export function useSessionReady(): boolean {
  return useContext(BootstrapContext).sessionReady;
}

/** Signed-in user, or null when anonymous or still loading. */
export function useAuthUser(): AuthUser | null {
  return useContext(BootstrapContext).user;
}

/** True once the user is known. Use it to avoid a "sign in" flash on first paint. */
export function useAuthReady(): boolean {
  return useContext(BootstrapContext).authReady;
}

/**
 * Re-fetches the nonce and user. Resolves true when the session is valid.
 * Concurrent calls share one request.
 */
export function useRefreshSession(): () => Promise<boolean> {
  return useContext(BootstrapContext).refresh;
}
