/** localStorage key for the user's "Add to Trip" attraction selections — shared between TopAttractions (writer) and the Saved page (reader). */
export const SAVED_ATTRACTIONS_KEY = "trip-planner:selected-attractions";

export function readSavedAttractionIds(): string[] {
  try {
    const raw = window.localStorage.getItem(SAVED_ATTRACTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
