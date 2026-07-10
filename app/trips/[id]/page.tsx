import { notFound, redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { createClient } from "@/lib/supabase/server";
import { addStop, deleteStop, deleteTrip } from "@/actions/trips";
import { forecastForDateRange, getForecast } from "@/lib/weather";
import { cityCode, formatDateRange } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { DeleteTripButton } from "@/components/DeleteTripButton";
import { WeatherHorizon } from "@/components/WeatherHorizon";
import { CityAutocomplete } from "@/components/CityAutocomplete";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Warm the connection for the OpenWeatherMap icon <img>s rendered below —
  // emitted as <link rel="preconnect"> in <head>, saving DNS+TCP+TLS on first icon fetch.
  preconnect("https://openweathermap.org");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Trip and stops queries are independent — run them in parallel. The trip
  // lookup is scoped to the signed-in user (defense in depth on top of RLS,
  // mirroring requireTripOwnership in actions/trips.ts) so a guessed/known
  // trip id belonging to another user can't be viewed here.
  const [{ data: trip }, { data: stops }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("trip_stops")
      .select("*")
      .eq("trip_id", id)
      .order("position", { ascending: true }),
  ]);
  if (!trip) notFound();

  let forecast: Awaited<ReturnType<typeof getForecast>> = [];
  let forecastNote: string | null = null;
  if (trip.destination_lat != null && trip.destination_lon != null) {
    const fullForecast = await getForecast(trip.destination_lat, trip.destination_lon);
    forecast = forecastForDateRange(fullForecast, trip.start_date, trip.end_date);
    if (forecast.length === 0) {
      // Two distinct reasons the trip's date range can end up with no
      // matching days, told apart so the message doesn't blame "5 day
      // limit" on what's actually a missing API key or an upstream outage
      // (fullForecast itself came back empty) — see getForecast's own
      // graceful-degradation comment in lib/weather.ts.
      forecastNote = fullForecast.length
        ? "Forecast opens up closer to your trip — OpenWeatherMap only covers the next 5 days."
        : "Weather forecast is temporarily unavailable for this destination.";
    }
  } else {
    forecastNote = "No weather data available for this destination.";
  }

  const deleteTripWithId = deleteTrip.bind(null, id);
  const addStopToTrip = addStop.bind(null, id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pt-4">
      <section className="glass-card enter flex items-stretch overflow-hidden">
        <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-1 py-4">
          <span className="font-display text-accent-400 text-2xl font-semibold tracking-wide">
            {cityCode(trip.destination_city)}
          </span>
          <span className="text-[10px] tracking-widest text-white/60 uppercase">
            Destination
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-semibold">{trip.name}</h1>
            <p className="text-sm text-white/70">
              {trip.destination_city} · {formatDateRange(trip.start_date, trip.end_date)}
            </p>
          </div>
          <DeleteTripButton tripName={trip.name} action={deleteTripWithId} />
        </div>
      </section>

      <section className="glass-card enter p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">
          Weather for {trip.destination_city}
        </h2>
        {forecast.length > 0 ? (
          <WeatherHorizon forecast={forecast} />
        ) : (
          <p className="text-sm text-white/70">{forecastNote}</p>
        )}
      </section>

      <section className="glass-card enter p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">Stops</h2>
        <form action={addStopToTrip} className="mb-6 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-2">
            City
            <CityAutocomplete
              name="city"
              placeholder="e.g. Kyoto"
              required
              className="glass-input w-full px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Arrival
            <input name="arrival_date" type="date" className="glass-input px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70">
            Departure
            <input name="departure_date" type="date" className="glass-input px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-2">
            Notes (optional)
            <input
              name="notes"
              placeholder="Booking numbers, must-sees…"
              className="glass-input px-3 py-2"
            />
          </label>
          <SubmitButton pendingLabel="Adding stop…" className="sm:col-span-2">
            Add stop
          </SubmitButton>
        </form>

        {stops?.length ? (
          <div className="stagger relative flex flex-col gap-4">
            <div className="absolute top-2 bottom-2 left-[5px] w-px bg-white/15" />
            {stops.map((stop) => {
              const deleteThisStop = deleteStop.bind(null, id, stop.id);
              return (
                <div key={stop.id} className="relative flex items-start gap-4">
                  <span className="bg-accent-400 ring-ink-900 relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg bg-white/5 p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{stop.city}</p>
                      <p className="text-sm text-white/70">
                        {formatDateRange(stop.arrival_date, stop.departure_date) ||
                          "No dates set"}
                      </p>
                      {stop.notes && (
                        <p className="mt-1 text-sm text-white/60">{stop.notes}</p>
                      )}
                    </div>
                    <form action={deleteThisStop} className="shrink-0">
                      <SubmitButton
                        variant="dangerGhost"
                        pendingLabel="Removing…"
                        aria-label={`Remove ${stop.city} from this trip`}
                      >
                        Remove
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/70">
            No stops yet — add your first stop above to build the itinerary.
          </p>
        )}
      </section>
    </div>
  );
}
