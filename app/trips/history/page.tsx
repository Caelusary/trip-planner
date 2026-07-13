import { Suspense } from "react";
import Link from "next/link";
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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-lg font-semibold">Trip history</h1>
          <Link
            href="/trips"
            className="text-accent-400 -m-2 shrink-0 rounded-md p-2 text-xs font-medium underline-offset-2 hover:underline"
          >
            Back to trips
          </Link>
        </div>
        <Suspense fallback={<TripListSkeleton />}>
          <PastTripsList userId={user.id} />
        </Suspense>
      </div>
    </TabPanelTransition>
  );
}
