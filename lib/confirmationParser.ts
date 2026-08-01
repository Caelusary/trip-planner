import type { StopType } from "@/lib/stopTypes";

export interface ParsedConfirmation {
  city?: string;
  arrivalDate?: string;
  departureDate?: string;
  confirmationNumber?: string;
  stopType?: StopType;
}

/**
 * Best-effort regex/keyword extraction from pasted confirmation-email text —
 * no external API or NLP service, so no account to create and nothing to
 * pay for, at the cost of being far less reliable than a real parser (e.g.
 * TripIt's). Every field it finds is meant to pre-fill an editable form
 * field, never to be inserted without the user reviewing it first.
 */

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toISODate(year: number, monthIndex: number, day: number): string | null {
  const date = new Date(Date.UTC(year, monthIndex, day));
  // Rejects calendar overflow (e.g. day 31 in a 30-day month) the same way
  // lib/validation.ts's requireDate does — round-trip and compare.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

const MONTH_NAME_DATE_RE =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi;
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
/** Assumes US-style M/D/YYYY (this app's confirmation emails skew US-centric) — genuinely ambiguous with D/M/YYYY, another reason every match stays "review before adding" rather than auto-applied. */
const SLASH_DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;

function extractDates(text: string): string[] {
  const found: string[] = [];

  for (const match of text.matchAll(MONTH_NAME_DATE_RE)) {
    const monthIndex = MONTH_INDEX[match[1].toLowerCase()];
    const iso = toISODate(Number(match[3]), monthIndex, Number(match[2]));
    if (iso) found.push(iso);
  }
  for (const match of text.matchAll(ISO_DATE_RE)) {
    const iso = toISODate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (iso) found.push(iso);
  }
  for (const match of text.matchAll(SLASH_DATE_RE)) {
    const iso = toISODate(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
    if (iso) found.push(iso);
  }

  return [...new Set(found)].sort();
}

const CONFIRMATION_LABEL_RE =
  /\b(?:confirmation|booking|reservation)\s*(?:number|no\.?|#|code)?\s*[:#]\s*([A-Z0-9]{4,10})\b/i;
const PNR_RE = /\b(?:pnr|record locator)\s*[:#]?\s*([A-Z0-9]{4,10})\b/i;

function extractConfirmationNumber(text: string): string | undefined {
  const match = CONFIRMATION_LABEL_RE.exec(text) ?? PNR_RE.exec(text);
  return match?.[1];
}

// Matched separately (case-insensitive label, then a case-SENSITIVE
// capitalized-word capture right after it) rather than as one combined
// regex — a single `[A-Za-z\s]+` capture has no natural place to stop
// before a digit/punctuation run ("Paris on 2026-10-01" has no comma or
// newline before the trailing content), and requiring capital letters is
// what keeps the match from swallowing lowercase filler words like "on".
const CITY_LABEL_PREFIX_RE = /\b(?:destination|arriving in|check-?in city|departure city|city)\s*:?\s*/i;
const CITY_PHRASE_PREFIX_RE = /\b(?:flight to|arriving in|traveling to|travelling to|trip to)\s+/i;
// `[ \t]+` (not `\s+`) between words so the match can't cross a line break
// and glue on the next line's capitalized field label (e.g. "Departure:").
const CAPITALIZED_WORDS_RE = /^([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){0,2})/;
const AIRPORT_CODE_RE = /\(([A-Z]{3})\)/;

function extractAfterPrefix(text: string, prefixRe: RegExp): string | undefined {
  const match = prefixRe.exec(text);
  if (!match) return undefined;
  const rest = text.slice(match.index + match[0].length);
  return CAPITALIZED_WORDS_RE.exec(rest)?.[1];
}

function extractCity(text: string): string | undefined {
  return (
    extractAfterPrefix(text, CITY_LABEL_PREFIX_RE) ??
    extractAfterPrefix(text, CITY_PHRASE_PREFIX_RE) ??
    AIRPORT_CODE_RE.exec(text)?.[1]
  );
}

const STOP_TYPE_KEYWORDS: Record<StopType, RegExp> = {
  flight: /\b(flight|boarding|departure gate|airline|e-ticket|itinerary number|seat)\b/gi,
  lodging: /\b(hotel|check-?in|check-?out|room reservation|nights?)\b/gi,
  restaurant: /\b(table for|party of|reservation at|dinner reservation|restaurant)\b/gi,
  transport: /\b(rental car|car rental|pick-?up location|shuttle|train ticket|bus ticket)\b/gi,
  activity: /(?!)/, // never wins by keyword match — it's the fallback when nothing else scores.
};

function guessStopType(text: string): StopType {
  let best: StopType = "activity";
  let bestCount = 0;
  for (const type of Object.keys(STOP_TYPE_KEYWORDS) as StopType[]) {
    const count = text.match(STOP_TYPE_KEYWORDS[type])?.length ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = type;
    }
  }
  return best;
}

export function parseConfirmationText(text: string): ParsedConfirmation {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const dates = extractDates(trimmed);
  const result: ParsedConfirmation = {
    city: extractCity(trimmed),
    confirmationNumber: extractConfirmationNumber(trimmed),
    stopType: guessStopType(trimmed),
  };
  if (dates.length > 0) result.arrivalDate = dates[0];
  if (dates.length > 1) result.departureDate = dates[dates.length - 1];
  return result;
}
