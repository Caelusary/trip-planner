import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchTripDetail } from "@/lib/trips";
import { cityCode, formatDateRange, tripCountdownLabel } from "@/lib/format";
import { STOP_TYPE_LABEL } from "@/lib/stopTypes";
import { TripPassActions } from "@/components/TripPassActions";

export default async function TripPassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { trip, stops } = await fetchTripDetail(supabase, id, user.id);
  if (!trip) notFound();

  const countdown = tripCountdownLabel(trip.start_date, trip.end_date);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-4">
      <div className="print:hidden flex items-center justify-between gap-4">
        <Link href={`/trips/${id}`} className="inline-flex min-h-11 items-center text-sm text-white/75 hover:text-white">
          ← Back to trip
        </Link>
        <TripPassActions tripName={trip.name} destinationCity={trip.destination_city} />
      </div>

      <section className="glass-card enter overflow-hidden">
        <div className="flex items-stretch">
          <div className="ticket-stub flex w-28 shrink-0 flex-col items-center justify-center gap-1 py-6">
            <span className="font-display text-accent-400 text-3xl font-semibold tracking-wide">
              {cityCode(trip.destination_city)}
            </span>
            <span className="ticket-label">Destination</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 px-6 py-6">
            <p className="ticket-label !text-accent-400">Trip Pass</p>
            <h1 className="font-display truncate text-2xl font-semibold">{trip.name}</h1>
            <p className="text-sm text-white/70">{trip.destination_city}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-white/15 px-6 py-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="ticket-label">Traveler</p>
              <p className="truncate text-sm text-white/90">{user.email}</p>
            </div>
            <div>
              <p className="ticket-label">Travel dates</p>
              <p className="text-sm text-white/90">{formatDateRange(trip.start_date, trip.end_date)}</p>
            </div>
            {countdown && (
              <div>
                <p className="ticket-label">Status</p>
                <p className="text-accent-400 text-sm font-medium">{countdown}</p>
              </div>
            )}
          </div>
        </div>

        {stops.length > 0 && (
          <div className="border-t border-dashed border-white/15 px-6 py-5">
            <p className="mb-3 ticket-label">Itinerary</p>
            <div className="flex flex-col gap-3">
              {stops.map((stop, i) => (
                <div key={stop.id} className="flex items-baseline gap-3 text-sm">
                  <span className="text-accent-400 w-5 shrink-0 text-right font-medium">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-white/90">
                    {stop.city}
                    <span className="text-white/65"> · {STOP_TYPE_LABEL[stop.stop_type]}</span>
                  </span>
                  <span className="ticket-data shrink-0 text-right text-white/75">
                    {formatDateRange(stop.arrival_date, stop.departure_date) || "No dates set"}
                    {stop.confirmation_number && (
                      <span className="block text-white/60">#{stop.confirmation_number}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-dashed border-white/15 px-6 py-4">
          <p className="text-center ticket-label">
            Issued by Trip Planner
          </p>
        </div>
      </section>
    </div>
  );
}
