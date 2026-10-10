import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as authApi from "../api/authApi";
import * as verifierApplicationsApi from "../api/verifierApplicationsApi";
import { setAuthToken } from "../api/http";
import { loadSession, saveSession, clearSession } from "../utils/session";
import {
  addPushTokenRefreshListener,
  registerForPushNotificationsAsync,
  unregisterPushTokenAsync,
} from "../utils/pushNotifications";
import { toast, errorMessage } from "../utils/toast";
import type { User, UserRole, VerifierApplicationPayload } from "../types";

interface AuthContextValue {
  user: User | null;
  /** True only while the saved session is being restored on app start. */
  isInitializing: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  acknowledgeVerifierApproval: () => Promise<void>;
  submitVerifierReapplication: (payload: VerifierApplicationPayload) => Promise<void>;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  role: "jobseeker" | "shopowner" | "verifier";
  password: string;
  district?: string;
  identityType?: string;
  identityNumber?: string;
  identityDocumentReference?: string;
  identityDocumentMetadata?: Record<string, unknown>;
  addressInformation?: string;
  communityReference?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const pushTokenRef = useRef<string | null>(null);

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
        setIsInitializing(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    registerForPushNotificationsAsync().then((token) => {
      if (isMounted) pushTokenRef.current = token;
    });

    const subscription = addPushTokenRefreshListener((token) => {
      pushTokenRef.current = token;
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [user]);

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
      await unregisterPushTokenAsync(pushTokenRef.current);
      pushTokenRef.current = null;
      await authApi.logout();
      setAuthToken(null);
      await clearSession();
      setUser(null);
      toast.success("Signed out", "You've been signed out successfully.");
    } catch (err) {
      toast.error("Could not sign out", errorMessage(err, "Please try again."));
      throw err;
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

  const refreshCurrentUser = useCallback(async () => {
    const freshUser = await authApi.fetchCurrentUser();
    setUser(freshUser);
    const session = await loadSession();
    if (session) await saveSession({ ...session, user: freshUser });
  }, []);

  const persistVerifierApplication = useCallback(async (application: NonNullable<User["verifierApplication"]>) => {
    setUser((current) => current ? { ...current, verifierApplication: application } : current);
    const session = await loadSession();
    if (session) await saveSession({ ...session, user: { ...session.user, verifierApplication: application } });
  }, []);

  const acknowledgeVerifierApproval = useCallback(async () => {
    if (!user?.verifierApplication) throw new Error("Approved verifier application not found.");
    const application = await verifierApplicationsApi.acknowledgeApproval(user.verifierApplication.id);
    await persistVerifierApplication(application);
  }, [persistVerifierApplication, user]);

  const submitVerifierReapplication = useCallback(async (payload: VerifierApplicationPayload) => {
    await verifierApplicationsApi.submitReapplication(payload);
    const freshUser = await authApi.fetchCurrentUser();
    setUser(freshUser);
    const session = await loadSession();
    if (session) await saveSession({ ...session, user: freshUser });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isInitializing, isLoading, login, loginWithGoogle, register, logout, switchRole, updateUser, refreshCurrentUser, acknowledgeVerifierApproval, submitVerifierReapplication }}
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
