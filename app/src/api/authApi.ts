import { http, extractErrorMessage } from "./http";
import type { User } from "../types";

export interface AuthResult {
  token: string;
  user: User;
  provider: "password" | "google";
}

// Fully simulated — no real Google OAuth is wired up for this build.
const GOOGLE_MOCK_USER: User = {
  id: "user-google-1",
  email: "amal.google@gmail.com",
  name: "Amal Perera",
  role: "jobseeker",
  phone: "0771234567",
  bio: "Signed in with Google.",
  location: "Colombo 03",
  trustScore: 78,
  createdAt: "2024-01-15T08:00:00Z",
};

export async function register(payload: {
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
}): Promise<AuthResult> {
  try {
    const { data } = await http.post("/auth/register", payload);
    return { token: data.token, user: data.user, provider: "password" };
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not create account. Try again."));
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const { data } = await http.post("/auth/login", { email, password });
    return { token: data.token, user: data.user, provider: "password" };
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Invalid email or password"));
  }
}

export async function loginWithGoogle(): Promise<AuthResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    token: `mock-google-${Date.now()}`,
    user: GOOGLE_MOCK_USER,
    provider: "google",
  };
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await http.get("/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  // JWT sessions are stateless — nothing to invalidate server-side.
}

export async function updateProfile(
  current: User,
  updates: { name?: string; phone?: string; bio?: string; location?: string; avatarUrl?: string }
): Promise<User> {
  if (current.id === GOOGLE_MOCK_USER.id) {
    // The Google sign-in flow is simulated — no backend account to update.
    return { ...current, ...updates };
  }
  try {
    const { data } = await http.put("/auth/me", updates);
    return data.user;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not update your profile."));
  }
}
