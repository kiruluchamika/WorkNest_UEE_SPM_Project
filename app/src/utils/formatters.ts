export function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-LK")}`;
}

// WorkNest operates only in Sri Lanka, so dates are always shown in
// Asia/Colombo local time (UTC+5:30) rather than the viewer's device
// timezone — otherwise a device set to a timezone west of UTC can
// display dates a day early.
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  });
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(isoDate);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function gigStatusBadge(
  status: string
): { label: string; variant: "success" | "warning" | "danger" | "muted" | "primary" } {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", variant: "success" };
    case "PENDING":
      return { label: "Pending", variant: "warning" };
    case "REJECTED":
      return { label: "Rejected", variant: "danger" };
    case "CLOSED":
      return { label: "Closed", variant: "muted" };
    case "COMPLETED":
      return { label: "Completed", variant: "primary" };
    default:
      return { label: status, variant: "muted" };
  }
}

export function reviewStatusBadge(
  status: string
): { label: string; variant: "success" | "warning" | "danger" | "muted" | "primary" } {
  switch (status) {
    case "PUBLISHED":
      return { label: "Published", variant: "success" };
    case "FLAGGED":
      return { label: "Flagged", variant: "warning" };
    case "REMOVED":
      return { label: "Removed", variant: "danger" };
    default:
      return { label: status, variant: "muted" };
  }
}

const NOTIFICATION_ICONS: Record<string, string> = {
  GIG_COMPLETED: "check-circle",
  REVIEW_REQUESTED: "edit-3",
  REVIEW_RECEIVED: "star",
  REVIEW_REPORTED: "flag",
  REVIEW_REMOVED: "trash-2",
  REPORT_RESOLVED: "check-square",
  REPORT_DISMISSED: "shield",
  ACCOUNT_WARNING: "alert-triangle",
  ACCOUNT_DISABLED: "slash",
  ACCOUNT_ENABLED: "user-check",
};

export function notificationMeta(type: string): { icon: string } {
  return { icon: NOTIFICATION_ICONS[type] ?? "bell" };
}

export function trustLevel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Top rated", color: "#2A9D8F" };
  if (score >= 70) return { label: "Trusted", color: "#2A9D8F" };
  if (score >= 50) return { label: "Building", color: "#E9C46A" };
  return { label: "New", color: "#5D6D7E" };
}
