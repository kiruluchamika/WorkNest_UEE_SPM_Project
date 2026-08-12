import { mockClient } from "./client";
import type { Gig } from "../types";

let MOCK_GIGS: Gig[] = [
  {
    id: "gig-1",
    title: "Weekend Café Assistant",
    description:
      "Help with serving customers, taking orders, and keeping the café tidy during weekend rush hours.",
    shopOwnerId: "user-2",
    shopOwnerName: "Savithri Silva",
    category: "hospitality",
    location: "Colombo 05",
    wage: 800,
    wageType: "day",
    status: "open",
    requiredSkills: ["Customer service", "Basic English", "Cash handling"],
    startDate: "2026-08-15",
    createdAt: "2026-08-05T08:00:00Z",
    applicantsCount: 3,
  },
  {
    id: "gig-2",
    title: "Delivery Rider (Part-time)",
    description:
      "Pick up and deliver food orders within a 5 km radius. Must have a bicycle or bike and a phone with data.",
    shopOwnerId: "user-2",
    shopOwnerName: "Savithri Silva",
    category: "delivery",
    location: "Colombo 03-08",
    wage: 250,
    wageType: "hour",
    status: "open",
    requiredSkills: ["Own bike", "Navigation", "Punctual"],
    startDate: "2026-08-12",
    createdAt: "2026-08-06T08:00:00Z",
    applicantsCount: 5,
  },
  {
    id: "gig-3",
    title: "Pop-Up Store Helper",
    description:
      "Assist at a weekend pop-up clothing store: setup, folding, customer assistance, and packing up.",
    shopOwnerId: "user-2",
    shopOwnerName: "Savithri Silva",
    category: "retail",
    location: "Colombo 07",
    wage: 1200,
    wageType: "fixed",
    status: "open",
    requiredSkills: ["Sales", "Friendly", "Weekend availability"],
    startDate: "2026-08-20",
    createdAt: "2026-08-07T08:00:00Z",
    applicantsCount: 1,
  },
  {
    id: "gig-4",
    title: "Event Setup Crew",
    description:
      "Help set up chairs, banners, and sound equipment for a community career fair.",
    shopOwnerId: "user-2",
    shopOwnerName: "Savithri Silva",
    category: "events",
    location: "Colombo 04",
    wage: 600,
    wageType: "day",
    status: "filled",
    requiredSkills: ["Physical fitness", "Teamwork"],
    startDate: "2026-08-10",
    createdAt: "2026-08-04T08:00:00Z",
    applicantsCount: 4,
  },
];

export async function listGigs(filters?: { category?: string; location?: string }): Promise<Gig[]> {
  let result = [...MOCK_GIGS];
  if (filters?.category && filters.category !== "all") {
    result = result.filter((g) => g.category === filters.category);
  }
  if (filters?.location) {
    result = result.filter((g) =>
      g.location.toLowerCase().includes(filters.location!.toLowerCase())
    );
  }
  return mockClient(result).then((r) => r.data);
}

export async function getGig(id: string): Promise<Gig | null> {
  const gig = MOCK_GIGS.find((g) => g.id === id) || null;
  return mockClient(gig).then((r) => r.data);
}

export async function createGig(payload: Omit<Gig, "id" | "createdAt" | "applicantsCount">): Promise<Gig> {
  const gig: Gig = {
    ...payload,
    id: `gig-${Date.now()}`,
    createdAt: new Date().toISOString(),
    applicantsCount: 0,
  };
  MOCK_GIGS = [gig, ...MOCK_GIGS];
  return mockClient(gig).then((r) => r.data);
}

export async function updateGig(id: string, updates: Partial<Gig>): Promise<Gig> {
  const index = MOCK_GIGS.findIndex((g) => g.id === id);
  if (index === -1) throw new Error("Gig not found");
  MOCK_GIGS[index] = { ...MOCK_GIGS[index], ...updates };
  return mockClient(MOCK_GIGS[index]).then((r) => r.data);
}

export function getLocalGigs(): Gig[] {
  return MOCK_GIGS;
}

export function setLocalGigs(gigs: Gig[]): void {
  MOCK_GIGS = gigs;
}
