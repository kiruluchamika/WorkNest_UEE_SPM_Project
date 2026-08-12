import { mockClient } from "./client";
import type { User } from "../types";

const MOCK_USERS: User[] = [
  {
    id: "user-1",
    email: "amal@example.com",
    name: "Amal Perera",
    role: "jobseeker",
    phone: "0771234567",
    bio: "Hard-working student looking for weekend retail and event gigs.",
    location: "Colombo 03",
    trustScore: 78,
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "user-2",
    email: "savi@example.com",
    name: "Savithri Silva",
    role: "shopowner",
    phone: "0712345678",
    bio: "Owner of Savi's Café & Bakeshop.",
    location: "Colombo 05",
    trustScore: 88,
    createdAt: "2023-11-20T08:00:00Z",
  },
  {
    id: "user-3",
    email: "nuwan@example.com",
    name: "Nuwan Dias",
    role: "verifier",
    phone: "0761234567",
    bio: "Community leader and youth employment coordinator.",
    location: "Colombo 04",
    trustScore: 95,
    createdAt: "2023-09-10T08:00:00Z",
  },
];

let currentUser: User | null = null;

export async function login(email: string, password: string): Promise<User> {
  const user = MOCK_USERS.find((u) => u.email === email.toLowerCase());
  if (!user || password.length < 6) {
    throw new Error("Invalid email or password");
  }
  currentUser = user;
  return mockClient(user).then((r) => r.data);
}

export async function register(payload: {
  name: string;
  email: string;
  phone: string;
  role: "jobseeker" | "shopowner" | "verifier";
  password: string;
}): Promise<User> {
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: payload.email.toLowerCase(),
    name: payload.name,
    role: payload.role,
    phone: payload.phone,
    trustScore: 50,
    createdAt: new Date().toISOString(),
  };
  currentUser = newUser;
  return mockClient(newUser).then((r) => r.data);
}

export async function getCurrentUser(): Promise<User | null> {
  return mockClient(currentUser).then((r) => r.data);
}

export async function logout(): Promise<void> {
  currentUser = null;
  return mockClient(undefined).then(() => undefined);
}

export async function updateProfile(userId: string, updates: Partial<User>): Promise<User> {
  const user = MOCK_USERS.find((u) => u.id === userId) || currentUser;
  if (!user) throw new Error("User not found");
  const updated = { ...user, ...updates };
  if (currentUser?.id === userId) currentUser = updated;
  return mockClient(updated).then((r) => r.data);
}
