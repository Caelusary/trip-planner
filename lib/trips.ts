import type { createClient } from "@/lib/supabase/server";
import type { TripCardTrip } from "@/components/TripCard";
import type { StopType } from "@/lib/stopTypes";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const TRIP_LIST_COLUMNS = "id, name, destination_city, start_date, end_date";
const TRIP_LIST_LIMIT = 100;

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  destination_city: string;
  destination_lat: number | null;
  destination_lon: number | null;
  start_date: string;
  end_date: string;
  created_at: string;
  share_token: string;
  share_enabled: boolean;
}

export interface TripStop {
  id: string;
  trip_id: string;
  city: string;
  lat: number | null;
  lon: number | null;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  stop_type: StopType;
  confirmation_number: string | null;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  label: string;
  checked: boolean;
  position: number;
  created_at: string;
}

/**
 * A trip, its stops, and its packing list, scoped to the given user —
 * shared by every page that renders a single trip's detail (the trip page
 * itself, the printable Trip Pass) so there's one place that knows how to
 * fetch it instead of each page re-deriving the same query shape.
 */
export async function fetchTripDetail(
  supabase: SupabaseServerClient,
  tripId: string,
  userId: string,
): Promise<{ trip: Trip | null; stops: TripStop[]; packingItems: PackingItem[] }> {
  const [{ data: trip }, { data: stops }, { data: packingItems }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).eq("user_id", userId).maybeSingle(),
    supabase
      .from("trip_stops")
      .select("*")
      .eq("trip_id", tripId)
      .order("position", { ascending: true }),
    supabase
      .from("packing_items")
      .select("*")
      .eq("trip_id", tripId)
      .order("position", { ascending: true }),
  ]);
  return { trip: trip ?? null, stops: stops ?? [], packingItems: packingItems ?? [] };
}

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
