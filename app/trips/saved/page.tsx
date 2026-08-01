import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchUpcomingTrips } from "@/lib/trips";
import type { TripCardTrip } from "@/components/TripCard";
import { SavedAttractionsList } from "@/components/SavedAttractionsList";

export default async function SavedPage() {
  // Saved attractions live in localStorage and work even signed out (see
  // SavedAttractionsList), so — unlike the other /trips/* pages — this one
  // doesn't redirect to /login. Trips are fetched only to power the
  // "add to an existing trip" picker on each card, and are simply empty
  // when signed out or once a trip is done (past trips can't take new stops
  // toward a future visit the same way, so only upcoming ones are offered).
  const user = await getCurrentUser();
  let trips: TripCardTrip[] = [];
  if (user) {
    const supabase = await createClient();
    trips = await fetchUpcomingTrips(supabase, user.id);
  }

  return <SavedAttractionsList trips={trips} />;
}
