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
        <Link href={`/trips/${id}`} className="text-sm text-white/60 hover:text-white/90">
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
            <span className="text-[10px] tracking-widest text-white/60 uppercase">Destination</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 px-6 py-6">
            <p className="text-accent-400 text-xs font-semibold tracking-widest uppercase">Trip Pass</p>
            <h1 className="font-display truncate text-2xl font-semibold">{trip.name}</h1>
            <p className="text-sm text-white/70">{trip.destination_city}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-white/15 px-6 py-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] tracking-widest text-white/50 uppercase">Traveler</p>
              <p className="truncate text-sm text-white/90">{user.email}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-white/50 uppercase">Travel dates</p>
              <p className="text-sm text-white/90">{formatDateRange(trip.start_date, trip.end_date)}</p>
            </div>
            {countdown && (
              <div>
                <p className="text-[10px] tracking-widest text-white/50 uppercase">Status</p>
                <p className="text-accent-400 text-sm font-medium">{countdown}</p>
              </div>
            )}
          </div>
        </div>

        {stops.length > 0 && (
          <div className="border-t border-dashed border-white/15 px-6 py-5">
            <p className="mb-3 text-[10px] tracking-widest text-white/50 uppercase">Itinerary</p>
            <div className="flex flex-col gap-3">
              {stops.map((stop, i) => (
                <div key={stop.id} className="flex items-baseline gap-3 text-sm">
                  <span className="text-accent-400 w-5 shrink-0 text-right font-medium">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-white/90">
                    {stop.city}
                    <span className="text-white/50"> · {STOP_TYPE_LABEL[stop.stop_type]}</span>
                  </span>
                  <span className="shrink-0 text-right text-white/60">
                    {formatDateRange(stop.arrival_date, stop.departure_date) || "No dates set"}
                    {stop.confirmation_number && (
                      <span className="block text-white/40">#{stop.confirmation_number}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-dashed border-white/15 px-6 py-4">
          <p className="text-center text-[10px] tracking-widest text-white/40 uppercase">
            Issued by Trip Planner
          </p>
        </div>
      </section>
    </div>
  );
}
