import React from "react";
import { TrustBadge } from "../trust/TrustBadge";
import type { JobApplicationStatus } from "../../types";

const STATUS_META: Record<JobApplicationStatus, { label: string; variant: "success" | "warning" | "danger" | "muted" | "primary" }> = {
  PENDING: { label: "Pending", variant: "warning" },
  SHORTLISTED: { label: "Shortlisted", variant: "primary" },
  HIRED: { label: "Hired", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  WITHDRAWN: { label: "Withdrawn", variant: "muted" },
  COMPLETED: { label: "Completed", variant: "primary" },
};

interface ApplicationStatusBadgeProps {
  status: JobApplicationStatus;
}

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({ status }) => {
  const meta = STATUS_META[status] ?? { label: status, variant: "muted" as const };
  return <TrustBadge label={meta.label} variant={meta.variant} />;
};
