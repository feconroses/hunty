"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { User, RegisterRequest } from "@/types";
import * as api from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = "hunty_user_data";

// Re-export for local use; canonical implementation lives in api.ts
function parseTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback(
    (accessToken: string) => {
      clearRefreshTimer();
      const expiry = parseTokenExpiry(accessToken);
      if (!expiry) {
        console.warn("[auth] scheduleTokenRefresh: could not parse token expiry");
        return;
      }

      // Refresh 1 minute before expiry
      const refreshIn = expiry - Date.now() - 60_000;
      if (refreshIn <= 0) {
        console.warn(`[auth] scheduleTokenRefresh: refreshIn=${Math.round(refreshIn / 1000)}s (token expires in ${Math.round((expiry - Date.now()) / 1000)}s) — NOT scheduling, relying on request interceptor`);
        return;
      }

      console.log(`[auth] Token refresh scheduled in ${Math.round(refreshIn / 1000)}s`);
      refreshTimerRef.current = setTimeout(async () => {
        console.log("[auth] Scheduled token refresh firing");
        try {
          const response = await api.refreshToken();
          api.setAccessToken(response.access_token);
          api.setCsrfToken(response.csrf_token);
          if (response.user) {
            setUser(response.user);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
          }
          console.log("[auth] Scheduled token refresh succeeded");
          scheduleTokenRefresh(response.access_token);
        } catch {
          // Don't nuke the session: the visibility handler or request interceptor
          // will retry. The httpOnly refresh cookie is still valid (30 days).
          console.warn("[auth] Scheduled token refresh failed — will retry on next visibility change or API call");
        }
      }, refreshIn);
    },
    [clearRefreshTimer]
  );

  const performLogin = useCallback(
    (response: { access_token: string; csrf_token: string; user: User }) => {
      console.log("[auth] performLogin — storing tokens and scheduling refresh");
      api.setAccessToken(response.access_token);
      api.setCsrfToken(response.csrf_token);
      setUser(response.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      scheduleTokenRefresh(response.access_token);
    },
    [scheduleTokenRefresh]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await api.login({ email, password });
        performLogin(response);
      } finally {
        setIsLoading(false);
      }
    },
    [performLogin]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      setIsLoading(true);
      try {
        const response = await api.register(data);
        performLogin(response);
      } finally {
        setIsLoading(false);
      }
    },
    [performLogin]
  );

  const logout = useCallback(async () => {
    console.log("[auth] logout() called");
    setIsLoading(true);
    try {
      await api.logout();
    } catch {
      // Logout endpoint might fail, but we still clear local state
    } finally {
      api.clearTokens();
      clearRefreshTimer();
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      setIsLoading(false);
    }
  }, [clearRefreshTimer]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  }, []);

  // On mount: attempt silent refresh
  useEffect(() => {
    async function initAuth() {
      console.log("[auth] initAuth starting on", window.location.pathname);
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        try {
          const cachedUser = JSON.parse(stored) as User;
          setUser(cachedUser);
          console.log("[auth] Restored cached user from localStorage");
        } catch {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }

      try {
        const response = await api.refreshToken();
        api.setAccessToken(response.access_token);
        api.setCsrfToken(response.csrf_token);
        setUser(response.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
        scheduleTokenRefresh(response.access_token);
        console.log("[auth] initAuth succeeded — session restored");
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        console.warn("[auth] initAuth refresh failed:", detail || err);
        api.clearTokens();
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setIsInitializing(false);
      }
    }

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multi-tab logout: listen for storage changes
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === USER_STORAGE_KEY && event.newValue === null) {
        console.log("[auth] Storage change detected — user data cleared in another tab");
        api.clearTokens();
        clearRefreshTimer();
        setUser(null);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [clearRefreshTimer]);

  // Proactive refresh when tab becomes visible (handles background tab throttling)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      const token = api.getAccessToken();
      if (!token) {
        console.log("[auth] Visibility change: no access token, skipping refresh");
        return;
      }

      const expiry = parseTokenExpiry(token);
      if (!expiry) return;

      // If token expires within 2 minutes, refresh now
      const timeLeft = expiry - Date.now();
      console.log(`[auth] Tab became visible — token expires in ${Math.round(timeLeft / 1000)}s`);
      if (timeLeft < 2 * 60 * 1000) {
        console.log("[auth] Token near expiry — proactive refresh on visibility change");
        api
          .refreshToken()
          .then((response) => {
            api.setAccessToken(response.access_token);
            api.setCsrfToken(response.csrf_token);
            if (response.user) {
              setUser(response.user);
              localStorage.setItem(
                USER_STORAGE_KEY,
                JSON.stringify(response.user)
              );
            }
            console.log("[auth] Visibility-based refresh succeeded");
            scheduleTokenRefresh(response.access_token);
          })
          .catch(() => {
            console.warn("[auth] Visibility-based refresh failed — session may be expired");
            // Don't nuke the session here either; let the request interceptor handle it
          });
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [scheduleTokenRefresh]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearRefreshTimer();
  }, [clearRefreshTimer]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitializing,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
