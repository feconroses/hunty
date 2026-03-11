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
      if (!expiry) return;

      // Refresh 1 minute before expiry
      const refreshIn = expiry - Date.now() - 60_000;
      if (refreshIn <= 0) return;

      refreshTimerRef.current = setTimeout(async () => {
        try {
          const response = await api.refreshToken();
          api.setAccessToken(response.access_token);
          api.setCsrfToken(response.csrf_token);
          if (response.user) {
            setUser(response.user);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
          }
          scheduleTokenRefresh(response.access_token);
        } catch {
          // Refresh failed — clear session
          api.clearTokens();
          setUser(null);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }, refreshIn);
    },
    [clearRefreshTimer]
  );

  const performLogin = useCallback(
    (response: { access_token: string; csrf_token: string; user: User }) => {
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
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        try {
          const cachedUser = JSON.parse(stored) as User;
          setUser(cachedUser);
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
      } catch {
        // No valid session — clear everything and ensure cookie is removed
        api.clearTokens();
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        try { await api.logout(); } catch { /* ignore */ }
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
        api.clearTokens();
        clearRefreshTimer();
        setUser(null);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [clearRefreshTimer]);

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
