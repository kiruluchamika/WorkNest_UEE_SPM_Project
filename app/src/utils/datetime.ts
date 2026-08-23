export const SRI_LANKA_TIMEZONE = "Asia/Colombo";

/**
 * Converts a Date to a "YYYY-MM-DD" string using its local calendar
 * fields (not UTC), so the day the user tapped on the calendar is the
 * day that gets sent to the backend — avoids the classic off-by-one
 * bug from `date.toISOString().slice(0, 10)` shifting to UTC first.
 */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Converts a Date to a 24-hour "HH:mm" wall-clock time string. */
export function toTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Parses a "YYYY-MM-DD" string into a local Date at midnight (for seeding a picker). */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Parses a "HH:mm" string into a Date carrying that wall-clock time today (for seeding a picker). */
export function parseTimeOnly(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

/**
 * Formats a "YYYY-MM-DD" (or full ISO) date-only string for display.
 * Backend date-only values are stored as UTC midnight, so we always
 * read them back with the UTC fields — this keeps the displayed day
 * fixed to the calendar day the business actually picked, regardless
 * of the viewer's device timezone (important since WorkNest gigs are
 * always scheduled in Sri Lanka time, Asia/Colombo, UTC+5:30).
 */
export function formatDateOnly(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Formats a 24-hour "HH:mm" string as a friendly 12-hour time, e.g. "2:30 PM". */
export function formatTimeOnly(value?: string): string | undefined {
  if (!value) return undefined;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`;
}
