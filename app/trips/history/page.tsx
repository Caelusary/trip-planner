import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPastTrips } from "@/lib/trips";
import { TripCard, TripListSkeleton } from "@/components/TripCard";
import { TabPanelTransition } from "@/components/TabPanelTransition";

async function PastTripsList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const trips = await fetchPastTrips(supabase, userId);

  return trips.length ? (
    <div className="stagger flex flex-col gap-4">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  ) : (
    <p className="glass-card p-6 text-sm text-white/70">
      No past trips yet — completed trips will show up here once their dates pass.
    </p>
  );
}

export default async function TripHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <TabPanelTransition>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 pt-4">
        {/* No "back to trips" link here — Tourist attractions is now its
            own tab in the top nav (see components/TopNav.tsx), so this
            page doesn't need a page-local copy of that link. */}
        <h1 className="font-display text-lg font-semibold">Trip history</h1>
        <Suspense fallback={<TripListSkeleton />}>
          <PastTripsList userId={user.id} />
        </Suspense>
      </div>
    </TabPanelTransition>
  );
}
