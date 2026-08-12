import { mockClient } from "./client";
import type { Application } from "../types";

let MOCK_APPLICATIONS: Application[] = [
  {
    id: "app-1",
    gigId: "gig-1",
    gigTitle: "Weekend Café Assistant",
    jobSeekerId: "user-1",
    jobSeekerName: "Amal Perera",
    message: "I have worked at a café before and I am available every weekend.",
    status: "pending",
    createdAt: "2026-08-06T08:00:00Z",
  },
  {
    id: "app-2",
    gigId: "gig-2",
    gigTitle: "Delivery Rider (Part-time)",
    jobSeekerId: "user-1",
    jobSeekerName: "Amal Perera",
    message: "I have a bike and I know the Colombo roads well.",
    status: "pending",
    createdAt: "2026-08-07T08:00:00Z",
  },
];

export async function applyForGig(
  gigId: string,
  gigTitle: string,
  jobSeekerId: string,
  jobSeekerName: string,
  message: string
): Promise<Application> {
  const application: Application = {
    id: `app-${Date.now()}`,
    gigId,
    gigTitle,
    jobSeekerId,
    jobSeekerName,
    message,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  MOCK_APPLICATIONS = [application, ...MOCK_APPLICATIONS];
  return mockClient(application).then((r) => r.data);
}

export async function listApplicationsByJobSeeker(jobSeekerId: string): Promise<Application[]> {
  return mockClient(
    MOCK_APPLICATIONS.filter((a) => a.jobSeekerId === jobSeekerId)
  ).then((r) => r.data);
}

export async function listApplicationsByGig(gigId: string): Promise<Application[]> {
  return mockClient(MOCK_APPLICATIONS.filter((a) => a.gigId === gigId)).then((r) => r.data);
}

export async function updateApplicationStatus(id: string, status: "accepted" | "rejected"): Promise<Application> {
  const index = MOCK_APPLICATIONS.findIndex((a) => a.id === id);
  if (index === -1) throw new Error("Application not found");
  MOCK_APPLICATIONS[index] = { ...MOCK_APPLICATIONS[index], status };
  return mockClient(MOCK_APPLICATIONS[index]).then((r) => r.data);
}
