import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTrip } from "@/actions/trips";

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pt-4">
      <section className="glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Plan a new trip</h2>
        <form action={createTrip} className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Trip name"
            required
            className="glass-input px-3 py-2 sm:col-span-2"
          />
          <input
            name="destination"
            placeholder="Destination city"
            required
            className="glass-input px-3 py-2 sm:col-span-2"
          />
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Start date
            <input name="start_date" type="date" required className="glass-input px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70">
            End date
            <input name="end_date" type="date" required className="glass-input px-3 py-2" />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-white/90 px-4 py-2 font-medium text-slate-900 transition hover:bg-white sm:col-span-2"
          >
            Create trip
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Your trips</h2>
        {trips?.length ? (
          trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="glass-card flex items-center justify-between p-5 transition hover:bg-white/15"
            >
              <div>
                <p className="font-medium">{trip.name}</p>
                <p className="text-sm text-white/70">{trip.destination_city}</p>
              </div>
              <p className="text-sm text-white/70">
                {trip.start_date} → {trip.end_date}
              </p>
            </Link>
          ))
        ) : (
          <p className="glass-card p-6 text-sm text-white/70">
            No trips yet — plan your first one above.
          </p>
        )}
      </section>
    </div>
  );
}
