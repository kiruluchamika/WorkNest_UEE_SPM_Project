export function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-LK")}`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

export function trustLevel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Top rated", color: "#2A9D8F" };
  if (score >= 70) return { label: "Trusted", color: "#2A9D8F" };
  if (score >= 50) return { label: "Building", color: "#E9C46A" };
  return { label: "New", color: "#5D6D7E" };
}
