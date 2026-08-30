/** Formats timezone-aware API timestamps in the browser/device's local timezone. */
export function formatVerifierDateTime(value?: string): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}
