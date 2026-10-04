import React from "react";
import { StatusBadge } from "../common/StatusBadge";
import type { JobApplicationStatus } from "../../types";

interface ApplicationStatusBadgeProps {
  status: JobApplicationStatus;
  size?: "sm" | "md";
}

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({ status, size = "md" }) => {
  return <StatusBadge status={status} size={size} />;
};

