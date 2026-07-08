import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { createClient } from "@/lib/supabase/server";
import { createTrip } from "@/actions/trips";
import { cityCode, formatDateRange } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { TopAttractions } from "@/components/TopAttractions";

function TripsListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass-card h-[76px] animate-pulse" />
      ))}
    </div>
  );
}

async function TripsList({ userId }: { userId: string }) {
  const supabase = await createClient();

  // Select only the columns the list view renders (not `*`) and cap rows
  // returned — an unbounded, all-column query would grow linearly with a
  // user's trip history forever with no upper bound. Also scope explicitly
  // to the signed-in user (defense in depth on top of RLS) instead of
  // relying solely on row-level security to filter the list.
  const { data: trips } = await supabase
    .from("trips")
    .select("id, name, destination_city, start_date, end_date")
    .eq("user_id", userId)
    .order("start_date", { ascending: true })
    .limit(100);

  return trips?.length ? (
    <div className="stagger flex flex-col gap-4">
      {trips.map((trip) => (
        <Link
          key={trip.id}
          href={`/trips/${trip.id}`}
          className="glass-card glass-card-link flex items-stretch overflow-hidden"
        >
          <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-1 py-4">
            <span className="font-display text-accent-400 text-2xl font-semibold tracking-wide">
              {cityCode(trip.destination_city)}
            </span>
            <span className="text-[10px] tracking-widest text-white/60 uppercase">
              Destination
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{trip.name}</p>
              <p className="truncate text-sm text-white/60">{trip.destination_city}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] tracking-widest text-white/60 uppercase">
                Travel dates
              </p>
              <p className="text-sm text-white/80">
                {formatDateRange(trip.start_date, trip.end_date)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <p className="glass-card p-6 text-sm text-white/70">
      No trips yet — plan your first one above.
    </p>
  );
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination } = await searchParams;
  // Warm the connection for the carousel's picsum.photos placeholder
  // images — the primary card image is this page's likely LCP element, so
  // this saves DNS+TCP+TLS the same way the trip-detail page's
  // openweathermap.org preconnect does for weather icons.
  preconnect("https://picsum.photos");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pt-4">
      <h1 className="sr-only">Your trips</h1>
      <TopAttractions />
      <section id="plan-trip" className="glass-card enter p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">Plan a new trip</h2>
        <form action={createTrip} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-2">
            Trip name
            <input
              name="name"
              placeholder="e.g. Spring in Kyoto"
              required
              className="glass-input px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-2">
            Destination city
            <CityAutocomplete
              key={destination ?? "blank"}
              name="destination"
              placeholder="e.g. Kyoto"
              required
              defaultValue={destination}
              className="glass-input w-full px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Start date
            <input name="start_date" type="date" required className="glass-input px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70">
            End date
            <input name="end_date" type="date" required className="glass-input px-3 py-2" />
          </label>
          <SubmitButton pendingLabel="Creating trip…" className="mt-2 sm:col-span-2">
            Create trip
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Your trips</h2>
        <Suspense fallback={<TripsListSkeleton />}>
          <TripsList userId={user.id} />
        </Suspense>
      </section>
    </div>
  );
}
