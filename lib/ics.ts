/**
 * Minimal RFC 5545 (iCalendar) writer — just enough to export a trip and its
 * stops as all-day VEVENTs. No library needed for something this small, and
 * a hand-rolled ICS file works with Apple Calendar, Google Calendar, and
 * Outlook alike (unlike a "Add to Google Calendar" link, which only works
 * with Google).
 */

export interface ICSEvent {
  uid: string;
  title: string;
  /** YYYY-MM-DD, inclusive. */
  startDate: string;
  /** YYYY-MM-DD, inclusive (all-day events store DTEND exclusive — handled internally). */
  endDate: string;
  description?: string;
  location?: string;
}

/** Escapes text per RFC 5545 §3.3.11 — commas, semicolons, backslashes, and newlines. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

/** "2026-09-12" -> "20260912" (all-day DATE value, no time/timezone component). */
function toICSDate(iso: string): string {
  return iso.replaceAll("-", "");
}

/** One day after `iso` — DTEND on an all-day VEVENT is exclusive per the spec. */
function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function nowStamp(): string {
  return `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** Wraps lines longer than 75 octets with a leading space, as RFC 5545 §3.1 requires. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function buildICS(calendarName: string, events: ICSEvent[]): string {
  const stamp = nowStamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Trip Planner//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DTSTART;VALUE=DATE:${toICSDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${toICSDate(nextDay(event.endDate))}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
