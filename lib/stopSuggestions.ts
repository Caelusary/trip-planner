import { attractionsFor, countryCodeFromLabel, type Attraction } from "@/lib/attractions";

const DEFAULT_LIMIT = 6;

/**
 * Picks candidate "things to do" stops for a trip from the curated
 * attractions dataset: same-city matches first (both ranked by rating),
 * padded out with the country's other top-rated attractions if the
 * destination city alone doesn't have enough. Returns [] when the
 * destination's country can't be recovered (see countryCodeFromLabel) or
 * isn't in the dataset, so callers can just skip rendering the section.
 */
export function suggestStopsForTrip(
  destinationCity: string,
  alreadyAddedNames: string[],
  limit = DEFAULT_LIMIT,
): Attraction[] {
  const countryCode = countryCodeFromLabel(destinationCity);
  if (!countryCode) return [];

  const cityName = destinationCity.split(",")[0]?.trim().toLowerCase();
  const excluded = new Set(alreadyAddedNames.map((name) => name.toLowerCase()));

  const candidates = attractionsFor(countryCode).filter(
    (attraction) => !excluded.has(attraction.name.toLowerCase()),
  );

  const sameCity = candidates
    .filter((attraction) => attraction.city.toLowerCase() === cityName)
    .sort((a, b) => b.rating - a.rating);
  const elsewhere = candidates
    .filter((attraction) => attraction.city.toLowerCase() !== cityName)
    .sort((a, b) => b.rating - a.rating);

  return [...sameCity, ...elsewhere].slice(0, limit);
}
