/** Mirrors the `trip_stops_stop_type_check` constraint added in the add_trip_stop_type_and_confirmation migration. */
export const STOP_TYPES = ["flight", "lodging", "activity", "restaurant", "transport"] as const;

export type StopType = (typeof STOP_TYPES)[number];

export const STOP_TYPE_LABEL: Record<StopType, string> = {
  flight: "Flight",
  lodging: "Lodging",
  activity: "Activity",
  restaurant: "Restaurant",
  transport: "Transport",
};

export function isStopType(value: string): value is StopType {
  return (STOP_TYPES as readonly string[]).includes(value);
}
