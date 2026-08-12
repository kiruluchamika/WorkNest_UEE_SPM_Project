import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authApi from "../api/authApi";
import { setAuthToken } from "../api/http";
import { loadSession, saveSession, clearSession } from "../utils/session";
import type { User, UserRole } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  role: "jobseeker" | "shopowner" | "verifier";
  password: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (!session) return;

        if (session.provider === "google") {
          setUser(session.user);
          return;
        }

        setAuthToken(session.token);
        try {
          const freshUser = await authApi.fetchCurrentUser();
          setUser(freshUser);
          await saveSession({ ...session, user: freshUser });
        } catch {
          setAuthToken(null);
          await clearSession();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(email, password);
      setAuthToken(result.token);
      await saveSession(result);
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await authApi.loginWithGoogle();
      await saveSession(result);
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const result = await authApi.register(payload);
      setAuthToken(result.token);
      await saveSession(result);
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setAuthToken(null);
      await clearSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : prev));
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) throw new Error("Not logged in");
      const updated = await authApi.updateProfile(user, updates);
      setUser(updated);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithGoogle, register, logout, switchRole, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
