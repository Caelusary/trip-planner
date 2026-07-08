import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addStop, deleteStop, deleteTrip } from "@/actions/trips";
import { forecastForDateRange, getForecast } from "@/lib/weather";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).single();
  if (!trip) notFound();

  const { data: stops } = await supabase
    .from("trip_stops")
    .select("*")
    .eq("trip_id", id)
    .order("position", { ascending: true });

  let forecast: Awaited<ReturnType<typeof getForecast>> = [];
  let forecastNote: string | null = null;
  if (trip.destination_lat != null && trip.destination_lon != null) {
    const fullForecast = await getForecast(trip.destination_lat, trip.destination_lon);
    forecast = forecastForDateRange(fullForecast, trip.start_date, trip.end_date);
    if (fullForecast.length && forecast.length === 0) {
      forecastNote =
        "Forecast opens up closer to your trip — OpenWeatherMap only covers the next 5 days.";
    }
  } else {
    forecastNote = "No weather data available for this destination.";
  }

  const deleteTripWithId = deleteTrip.bind(null, id);
  const addStopToTrip = addStop.bind(null, id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pt-4">
      <section className="glass-card flex items-center justify-between p-6">
        <div>
          <h1 className="text-xl font-semibold">{trip.name}</h1>
          <p className="text-sm text-white/70">
            {trip.destination_city} · {trip.start_date} → {trip.end_date}
          </p>
        </div>
        <form action={deleteTripWithId}>
          <button
            type="submit"
            className="rounded-md border border-red-400/40 px-3 py-1.5 text-sm text-red-100 transition hover:bg-red-500/20"
          >
            Delete trip
          </button>
        </form>
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Weather for {trip.destination_city}</h2>
        {forecast.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto">
            {forecast.map((day) => (
              <div
                key={day.date}
                className="flex min-w-[110px] flex-col items-center gap-1 rounded-lg bg-white/10 p-3"
              >
                <span className="text-xs text-white/70">{day.date}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                  alt={day.condition}
                  className="h-10 w-10"
                />
                <span className="text-sm">
                  {day.tempMax}° / {day.tempMin}°
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">{forecastNote}</p>
        )}
      </section>

      <section className="glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Stops</h2>
        <form action={addStopToTrip} className="mb-6 grid gap-3 sm:grid-cols-2">
          <input
            name="city"
            placeholder="City"
            required
            className="glass-input px-3 py-2 sm:col-span-2"
          />
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Arrival
            <input name="arrival_date" type="date" className="glass-input px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Departure
            <input name="departure_date" type="date" className="glass-input px-3 py-2" />
          </label>
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="glass-input px-3 py-2 sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-md bg-white/90 px-4 py-2 font-medium text-slate-900 transition hover:bg-white sm:col-span-2"
          >
            Add stop
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {stops?.length ? (
            stops.map((stop) => {
              const deleteThisStop = deleteStop.bind(null, id, stop.id);
              return (
                <div
                  key={stop.id}
                  className="flex items-center justify-between rounded-lg bg-white/10 p-4"
                >
                  <div>
                    <p className="font-medium">{stop.city}</p>
                    <p className="text-sm text-white/70">
                      {stop.arrival_date ?? "—"} → {stop.departure_date ?? "—"}
                    </p>
                    {stop.notes && <p className="mt-1 text-sm text-white/60">{stop.notes}</p>}
                  </div>
                  <form action={deleteThisStop}>
                    <button type="submit" className="text-sm text-red-200 hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-white/70">No stops yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
