/**
 * Form input validation helpers shared by the trip/stop server actions.
 * Pulled out of actions/trips.ts (a "use server" file, which may only
 * export async functions) so these pure functions stay unit-testable.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT_LENGTH = 200;
export const MAX_NOTES_LENGTH = 2000;

export function requireText(value: FormDataEntryValue | null, field: string): string {
  if (typeof value !== "string") throw new Error(`Invalid ${field}.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error(`Invalid ${field}.`);
  }
  return trimmed;
}

export function requireDate(value: FormDataEntryValue | null, field: string): string {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw new Error(`Invalid ${field}.`);
  }
  const parsed = new Date(value);
  // Date.parse silently normalizes calendar overflow (e.g. "2026-02-30" becomes
  // March 2) instead of rejecting it, so round-trip the parsed date back to
  // YYYY-MM-DD and require it to match the input exactly.
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}

export function optionalDate(value: FormDataEntryValue | null, field: string): string | null {
  if (value == null || value === "") return null;
  return requireDate(value, field);
}

export function requireUuid(value: string, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}
