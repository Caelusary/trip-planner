import type { createClient } from "@/lib/supabase/server";
import type { TripCardTrip } from "@/components/TripCard";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const TRIP_LIST_COLUMNS = "id, name, destination_city, start_date, end_date";
const TRIP_LIST_LIMIT = 100;

/**
 * "Today" as a UTC date-only string, matching how `start_date`/`end_date`
 * are stored (Postgres `date`, no time component) — comparing against a
 * timestamp would drift by the server's local offset.
 */
function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Upcoming trips (still ongoing or in the future), soonest first — the
 * default `/trips` view. Past trips live in their own history view instead
 * of growing this list forever.
 */
export async function fetchUpcomingTrips(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<TripCardTrip[]> {
  const { data } = await supabase
    .from("trips")
    .select(TRIP_LIST_COLUMNS)
    .eq("user_id", userId)
    .gte("end_date", todayISODate())
    .order("start_date", { ascending: true })
    .limit(TRIP_LIST_LIMIT);
  return data ?? [];
}

/** Past trips, most recently ended first — the dedicated `/trips/history` view. */
export async function fetchPastTrips(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<TripCardTrip[]> {
  const { data } = await supabase
    .from("trips")
    .select(TRIP_LIST_COLUMNS)
    .eq("user_id", userId)
    .lt("end_date", todayISODate())
    .order("start_date", { ascending: false })
    .limit(TRIP_LIST_LIMIT);
  return data ?? [];
}
