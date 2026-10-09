import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchUpcomingTrips } from "@/lib/trips";
import { TripCard, TripListSkeleton, tripNights } from "@/components/TripCard";
import { TabPanelTransition } from "@/components/TabPanelTransition";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

async function UpcomingTripsList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const trips = await fetchUpcomingTrips(supabase, userId);

  if (!trips.length) {
    return (
      <EmptyState
        title="No departures scheduled"
        body="Plan a trip with a destination and dates, then add stops, check the forecast and build a packing list. Not sure where yet? Browse attractions first."
        actions={[
          { href: "/trips/plan", label: "Plan a trip", primary: true },
          { href: "/trips", label: "Browse attractions" },
        ]}
      />
    );
  }

  const nights = trips.reduce((sum, trip) => sum + tripNights(trip.start_date, trip.end_date), 0);
  return (
    <section aria-label="Upcoming trips" className="flex flex-col gap-3">
      <p className="ticket-label">
        {trips.length} {trips.length === 1 ? "trip" : "trips"} · {nights} nights planned
      </p>
      <div className="stagger flex flex-col gap-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default async function UpcomingTripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <TabPanelTransition>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <PageHeader
          title="Upcoming trips"
          meta="Your next departures, soonest first."
          action={{ href: "/trips/plan", label: "Plan a trip" }}
        />
        <Suspense fallback={<TripListSkeleton />}>
          <UpcomingTripsList userId={user.id} />
        </Suspense>
      </div>
    </TabPanelTransition>
  );
}
