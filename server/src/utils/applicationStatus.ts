import { ApplicationStatus } from "@prisma/client";

// Centralized status graph for the hiring workflow. PENDING -> HIRED is
// allowed directly (without SHORTLISTED) so businesses hiring for short,
// temporary gigs aren't forced through an extra step.
const APPLICATION_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  PENDING: ["SHORTLISTED", "REJECTED", "WITHDRAWN", "HIRED"],
  SHORTLISTED: ["HIRED", "REJECTED", "WITHDRAWN"],
  HIRED: ["COMPLETED"],
  REJECTED: [],
  WITHDRAWN: [],
  COMPLETED: [],
};

export function canTransitionApplicationStatus(
  current: ApplicationStatus,
  next: ApplicationStatus
): boolean {
  return APPLICATION_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getStatusesThatCanTransitionTo(target: ApplicationStatus): ApplicationStatus[] {
  return (Object.keys(APPLICATION_STATUS_TRANSITIONS) as ApplicationStatus[]).filter((status) =>
    APPLICATION_STATUS_TRANSITIONS[status].includes(target)
  );
}
