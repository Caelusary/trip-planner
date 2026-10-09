/**
 * Date formatting helpers for YYYY-MM-DD strings (as stored in Supabase).
 * Dates are parsed as UTC so the displayed day never shifts with the
 * server/client timezone.
 */

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const DAY = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });

const WEEKDAY_SHORT = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-07-09" -> "Thu, Jul 9" (for forecast day chips) */
export function formatDayShort(iso: string | null | undefined): string {
  const date = parseISODate(iso);
  return date ? WEEKDAY_MONTH_DAY.format(date) : "";
}

/** "2026-07-09" -> "Thu" (for the compact forecast card grid) */
export function formatWeekdayShort(iso: string | null | undefined): string {
  const date = parseISODate(iso);
  return date ? WEEKDAY_SHORT.format(date) : "";
}

/**
 * "2026-07-09", "2026-07-12" -> "Jul 9 – 12, 2026"
 * Falls back gracefully across months ("Jul 30 – Aug 2, 2026")
 * and years ("Dec 30, 2026 – Jan 2, 2027").
 */
export function formatDateRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);

  if (start && end) {
    if (start.getTime() === end.getTime()) return MONTH_DAY_YEAR.format(start);
    if (start.getUTCFullYear() === end.getUTCFullYear()) {
      if (start.getUTCMonth() === end.getUTCMonth()) {
        return `${MONTH_DAY.format(start)} – ${DAY.format(end)}, ${start.getUTCFullYear()}`;
      }
      return `${MONTH_DAY.format(start)} – ${MONTH_DAY.format(end)}, ${start.getUTCFullYear()}`;
    }
    return `${MONTH_DAY_YEAR.format(start)} – ${MONTH_DAY_YEAR.format(end)}`;
  }
  if (start) return `From ${MONTH_DAY_YEAR.format(start)}`;
  if (end) return `Until ${MONTH_DAY_YEAR.format(end)}`;
  return "";
}

export type TripStatus = "ongoing" | "upcoming" | "past";

/**
 * Status relative to today (UTC date-only, matching how `start_date`/
 * `end_date` are stored as Postgres `date` columns — see lib/trips.ts's
 * todayISODate for why UTC rather than local time).
 */
export function tripStatus(startIso: string, endIso: string): TripStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (endIso < today) return "past";
  if (startIso <= today) return "ongoing";
  return "upcoming";
}

/** Whole days between two YYYY-MM-DD dates (UTC, date-only — see parseISODate). */
function daysBetween(fromIso: string, toIso: string): number {
  const from = parseISODate(fromIso);
  const to = parseISODate(toIso);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * "N days to go" / "N days left" style countdown, the small nudge that a
 * plain date range doesn't give you — seeing the number shrink each day is
 * what makes a trip feel imminent rather than just a row in a list. `null`
 * for past trips, where a countdown no longer means anything.
 */
export function tripCountdownLabel(startIso: string, endIso: string): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const status = tripStatus(startIso, endIso);

  if (status === "past") return null;

  if (status === "ongoing") {
    const daysLeft = daysBetween(today, endIso);
    if (daysLeft <= 0) return "Last day";
    return daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
  }

  // "upcoming" always has a start strictly after today (tripStatus already
  // classifies a same-day start as "ongoing"), so daysUntil is never 0 here.
  const daysUntil = daysBetween(today, startIso);
  return daysUntil === 1 ? "1 day to go" : `${daysUntil} days to go`;
}

/**
 * Decorative 3-letter "airport style" code for the boarding-pass card motif —
 * not a real IATA lookup, just the city name's first letters.
 * "Tokyo, JP" -> "TOK", "Kyoto" -> "KYO"
 */
export function cityCode(city: string): string {
  const letters = city.split(",")[0].replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, 3) || "—";
}
