import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 4000;

// Auto-detect the backend host from however Expo was loaded, so teammates
// don't have to hardcode/update their LAN IP in .env every time it changes.
// EXPO_PUBLIC_API_URL still wins when set (e.g. pointing at a deployed backend).
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname}:${API_PORT}`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) {
    return `http://${host}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

const API_URL = resolveApiUrl();

export const http = axios.create({
  baseURL: `${API_URL}/api`,
});

export function setAuthToken(token: string | null): void {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: string; issues?: { path?: string; message?: string }[] }
      | undefined;
    // Validation failures carry the specific reason in `issues`; show that
    // instead of the generic "Validation failed".
    const issueMessage = data?.issues?.[0]?.message;
    if (issueMessage) return issueMessage;
    if (data?.error) return data.error;
  }
  return fallback;
}
