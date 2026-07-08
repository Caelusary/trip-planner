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

/**
 * Decorative 3-letter "airport style" code for the boarding-pass card motif —
 * not a real IATA lookup, just the city name's first letters.
 * "Tokyo, JP" -> "TOK", "Kyoto" -> "KYO"
 */
export function cityCode(city: string): string {
  const letters = city.split(",")[0].replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, 3) || "—";
}
