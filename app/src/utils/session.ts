import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "../types";

const SESSION_KEY = "worknest_session";

export interface StoredSession {
  token: string;
  user: User;
  provider: "password" | "google";
}

// expo-secure-store has no web implementation — fall back to AsyncStorage there.
async function getItem(key: string): Promise<string | null> {
  return Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  await setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await removeItem(SESSION_KEY);
}
