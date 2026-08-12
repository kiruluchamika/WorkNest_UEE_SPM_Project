import { mockClient } from "./client";
import type { Endorsement } from "../types";

let MOCK_ENDORSEMENTS: Endorsement[] = [
  {
    id: "end-1",
    verifierId: "user-3",
    verifierName: "Nuwan Dias",
    jobSeekerId: "user-1",
    jobSeekerName: "Amal Perera",
    skill: "Customer service",
    note: "Amal helped at our community book drive. Polite, punctual, and great with people.",
    createdAt: "2026-07-20T08:00:00Z",
  },
];

export async function listEndorsementsForJobSeeker(jobSeekerId: string): Promise<Endorsement[]> {
  return mockClient(
    MOCK_ENDORSEMENTS.filter((e) => e.jobSeekerId === jobSeekerId)
  ).then((r) => r.data);
}

export async function createEndorsement(payload: {
  verifierId: string;
  verifierName: string;
  jobSeekerId: string;
  jobSeekerName: string;
  skill: string;
  note: string;
}): Promise<Endorsement> {
  const endorsement: Endorsement = {
    id: `end-${Date.now()}`,
    ...payload,
    createdAt: new Date().toISOString(),
  };
  MOCK_ENDORSEMENTS = [endorsement, ...MOCK_ENDORSEMENTS];
  return mockClient(endorsement).then((r) => r.data);
}
