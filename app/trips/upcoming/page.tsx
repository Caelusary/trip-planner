import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchUpcomingTrips } from "@/lib/trips";
import { TripCard, TripListSkeleton } from "@/components/TripCard";
import { TabPanelTransition } from "@/components/TabPanelTransition";

async function UpcomingTripsList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const trips = await fetchUpcomingTrips(supabase, userId);

  return trips.length ? (
    <div className="stagger flex flex-col gap-4">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  ) : (
    <p className="glass-card p-6 text-sm text-white/70">
      No trips yet — plan your first one on the trips page.
    </p>
  );
}

export default async function UpcomingTripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <TabPanelTransition>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 pt-4">
        {/* No "back to trips" / "plan a trip" links here — both are now
            tabs in the top nav (see components/TopNav.tsx) rather than
            page-local links, so this page doesn't need its own copies. */}
        <h1 className="font-display text-lg font-semibold">Upcoming trips</h1>
        <Suspense fallback={<TripListSkeleton />}>
          <UpcomingTripsList userId={user.id} />
        </Suspense>
      </div>
    </TabPanelTransition>
  );
}
