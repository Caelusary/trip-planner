import { Suspense } from "react";
import Link from "next/link";
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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-lg font-semibold">Upcoming trips</h1>
          <Link
            href="/trips"
            className="text-accent-400 -m-2 shrink-0 rounded-md p-2 text-xs font-medium underline-offset-2 hover:underline"
          >
            Plan a trip
          </Link>
        </div>
        <Suspense fallback={<TripListSkeleton />}>
          <UpcomingTripsList userId={user.id} />
        </Suspense>
      </div>
    </TabPanelTransition>
  );
}
