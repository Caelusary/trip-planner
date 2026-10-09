import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchPastTrips } from "@/lib/trips";
import { TripCard, TripListSkeleton, tripNights } from "@/components/TripCard";
import { TabPanelTransition } from "@/components/TabPanelTransition";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

async function PastTripsList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const trips = await fetchPastTrips(supabase, userId);

  if (!trips.length) {
    return (
      <EmptyState
        title="No past trips yet"
        body="Trips move here on their own once their end date passes, so this becomes a log of everywhere you've been."
        actions={[{ href: "/trips/upcoming", label: "See upcoming trips" }]}
      />
    );
  }

  const nights = trips.reduce((sum, trip) => sum + tripNights(trip.start_date, trip.end_date), 0);
  const places = new Set(trips.map((trip) => trip.destination_city)).size;
  return (
    <section aria-label="Past trips" className="flex flex-col gap-3">
      <p className="ticket-label">
        {trips.length} {trips.length === 1 ? "trip" : "trips"} · {places}{" "}
        {places === 1 ? "destination" : "destinations"} · {nights} nights away
      </p>
      <div className="stagger flex flex-col gap-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default async function TripHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <TabPanelTransition>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <PageHeader title="Trip history" meta="Everywhere you've been, most recent first." />
        <Suspense fallback={<TripListSkeleton />}>
          <PastTripsList userId={user.id} />
        </Suspense>
      </div>
    </TabPanelTransition>
  );
}
