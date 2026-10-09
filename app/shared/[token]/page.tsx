import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cityCode, formatDateRange } from "@/lib/format";
import { STOP_TYPE_LABEL } from "@/lib/stopTypes";
import type { Trip, TripStop } from "@/lib/trips";
import { TripPassActions } from "@/components/TripPassActions";

/**
 * Public, no-login route for a trip's owner-shared read-only link. Reads
 * through the `get_shared_trip`/`get_shared_trip_stops` SECURITY DEFINER
 * functions (see the add_trip_share_links migration) rather than the
 * `trips`/`trip_stops` tables directly — RLS on those tables is still
 * scoped to the owner only; the functions are the one deliberate hole,
 * gated on knowing this exact token.
 */
export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: trip }, { data: stops }] = await Promise.all([
    supabase.rpc("get_shared_trip", { p_token: token }),
    supabase.rpc("get_shared_trip_stops", { p_token: token }),
  ]);
  // get_shared_trip returns `public.trips` (a single composite row, not
  // `setof`) — when its internal query finds no match, Postgres/PostgREST
  // represents that as one row of all-NULL fields, not a JSON `null`.
  // Verified live: a bogus token comes back as `{ id: null, ... }`, which
  // is truthy — `!trip` alone would never catch it.
  if (!trip || trip.id == null) notFound();

  const typedTrip = trip as Trip;
  const typedStops = (stops ?? []) as TripStop[];

  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="print:hidden flex items-center justify-between gap-4">
        <Link href="/" className="font-display inline-flex min-h-11 items-center text-sm font-semibold text-white/80 hover:text-white">
          Trip Planner
        </Link>
        <TripPassActions tripName={typedTrip.name} destinationCity={typedTrip.destination_city} />
      </div>

      <p className="print:hidden text-xs text-white/70">
        You&rsquo;re viewing a shared, read-only trip. You&rsquo;ll need your own account to plan one.
      </p>

      <section className="glass-card enter overflow-hidden">
        <div className="flex items-stretch">
          <div className="ticket-stub flex w-28 shrink-0 flex-col items-center justify-center gap-1 py-6">
            <span className="font-display text-accent-400 text-3xl font-semibold tracking-wide">
              {cityCode(typedTrip.destination_city)}
            </span>
            <span className="ticket-label">Destination</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 px-6 py-6">
            <p className="ticket-label !text-accent-400">Trip Pass</p>
            <h1 className="font-display truncate text-2xl font-semibold">{typedTrip.name}</h1>
            <p className="text-sm text-white/70">{typedTrip.destination_city}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-white/15 px-6 py-5">
          <p className="ticket-label">Travel dates</p>
          <p className="text-sm text-white/90">
            {formatDateRange(typedTrip.start_date, typedTrip.end_date)}
          </p>
        </div>

        {typedStops.length > 0 && (
          <div className="border-t border-dashed border-white/15 px-6 py-5">
            <p className="mb-3 ticket-label">Itinerary</p>
            <div className="flex flex-col gap-3">
              {typedStops.map((stop, i) => (
                <div key={stop.id} className="flex items-baseline gap-3 text-sm">
                  <span className="text-accent-400 w-5 shrink-0 text-right font-medium">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-white/90">
                    {stop.city}
                    <span className="text-white/65"> · {STOP_TYPE_LABEL[stop.stop_type]}</span>
                  </span>
                  <span className="ticket-data shrink-0 text-white/75">
                    {formatDateRange(stop.arrival_date, stop.departure_date) || "No dates set"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-dashed border-white/15 px-6 py-4">
          <p className="text-center ticket-label">
            Shared via Trip Planner
          </p>
        </div>
      </section>
    </main>
  );
}
