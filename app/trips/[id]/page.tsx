import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { addStop, addSuggestedStop, deleteStop, deleteTrip, setTripSharing } from "@/actions/trips";
import {
  addPackingItem,
  deletePackingItem,
  generatePackingSuggestions,
  renamePackingItem,
  togglePackingItem,
} from "@/actions/packing";
import { forecastForDateRange, getForecast } from "@/lib/weather";
import { fetchTripDetail, type Trip } from "@/lib/trips";
import { cityCode, formatDateRange, tripCountdownLabel } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { DeleteTripButton } from "@/components/DeleteTripButton";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { AddStopForm } from "@/components/AddStopForm";
import { SuggestedStops } from "@/components/SuggestedStops";
import { suggestStopsForTrip } from "@/lib/stopSuggestions";
import { WeatherForecast, WeatherForecastSkeleton } from "@/components/WeatherForecast";
import { TripMapLoader } from "@/components/TripMapLoader";
import type { MapPoint } from "@/components/TripMap";
import { ShareTripToggle } from "@/components/ShareTripToggle";
import { PackingList } from "@/components/PackingList";
import { STOP_TYPE_LABEL } from "@/lib/stopTypes";

/**
 * Its own Suspense boundary (see the section below) so the OpenWeatherMap
 * round trip, an external network call, the slowest single thing this page
 * does, doesn't block the header/map/stops/packing list from rendering.
 * Those all come from the one Supabase query already awaited above this
 * component; only the forecast fetch is deferred.
 */
async function WeatherSection({ trip }: { trip: Trip }) {
  if (trip.destination_lat == null || trip.destination_lon == null) {
    return <p className="text-sm text-white/70">No weather data available for this destination.</p>;
  }

  const fullForecast = await getForecast(trip.destination_lat, trip.destination_lon);
  const forecast = forecastForDateRange(fullForecast, trip.start_date, trip.end_date);

  if (forecast.length === 0) {
    // Two distinct reasons the trip's date range can end up with no
    // matching days, told apart so the message doesn't blame "5 day limit"
    // on what's actually a missing API key or an upstream outage
    // (fullForecast itself came back empty) — see getForecast's own
    // graceful-degradation comment in lib/weather.ts.
    const note = fullForecast.length
      ? "The forecast opens up closer to your trip. It only covers the next 5 days."
      : "Weather forecast is temporarily unavailable for this destination.";
    return <p className="text-sm text-white/70">{note}</p>;
  }

  return <WeatherForecast forecast={forecast} />;
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Warm the connection for the OpenWeatherMap icon <img>s rendered below —
  // emitted as <link rel="preconnect"> in <head>, saving DNS+TCP+TLS on first icon fetch.
  preconnect("https://openweathermap.org");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  // Scoped to the signed-in user (defense in depth on top of RLS, mirroring
  // requireTripOwnership in actions/trips.ts) so a guessed/known trip id
  // belonging to another user can't be viewed here.
  const { trip, stops, packingItems } = await fetchTripDetail(supabase, id, user.id);
  if (!trip) notFound();

  const countdown = tripCountdownLabel(trip.start_date, trip.end_date);

  const deleteTripWithId = deleteTrip.bind(null, id);
  const addStopToTrip = addStop.bind(null, id);
  const addSuggestedStopToTrip = addSuggestedStop.bind(null, id);
  const suggestedStops = suggestStopsForTrip(
    trip.destination_city,
    stops.map((stop) => stop.notes).filter((notes): notes is string => Boolean(notes)),
  );
  const addPackingItemToTrip = addPackingItem.bind(null, id);
  const togglePackingItemForTrip = togglePackingItem.bind(null, id);
  const renamePackingItemForTrip = renamePackingItem.bind(null, id);
  const deletePackingItemForTrip = deletePackingItem.bind(null, id);
  const generatePackingSuggestionsForTrip = generatePackingSuggestions.bind(null, id);

  const mapPoints: MapPoint[] = [
    ...(trip.destination_lat != null && trip.destination_lon != null
      ? [{ id: `trip-${trip.id}`, label: trip.destination_city, lat: trip.destination_lat, lon: trip.destination_lon }]
      : []),
    ...stops
      .filter((stop): stop is typeof stop & { lat: number; lon: number } => stop.lat != null && stop.lon != null)
      .map((stop) => ({ id: stop.id, label: stop.city, lat: stop.lat, lon: stop.lon })),
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pt-4">
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
            {countdown && (
              <p className="text-accent-400 mt-0.5 text-xs font-medium">{countdown}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/trips/${id}/pass`}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
            >
              Trip pass
            </Link>
            <ShareTripToggle
              tripId={id}
              shareToken={trip.share_token}
              initialEnabled={trip.share_enabled}
              setSharing={setTripSharing}
            />
            <AddToCalendarButton
              tripId={id}
              tripName={trip.name}
              destinationCity={trip.destination_city}
              startDate={trip.start_date}
              endDate={trip.end_date}
              stops={stops}
            />
            <DeleteTripButton tripName={trip.name} action={deleteTripWithId} />
          </div>
        </div>
      </section>

      <section className="glass-card enter p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">
          Weather for {trip.destination_city}
        </h2>
        <Suspense fallback={<WeatherForecastSkeleton />}>
          <WeatherSection trip={trip} />
        </Suspense>
      </section>

      <section className="glass-card enter p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">Map</h2>
        <TripMapLoader points={mapPoints} />
      </section>

      <section className="glass-card enter p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">Stops</h2>
        <SuggestedStops suggestions={suggestedStops} addAction={addSuggestedStopToTrip} />
        <AddStopForm action={addStopToTrip} />

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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{stop.city}</p>
                        <span className="border-accent-400/40 bg-accent-400/15 text-accent-400 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                          {STOP_TYPE_LABEL[stop.stop_type]}
                        </span>
                      </div>
                      <p className="text-sm text-white/70">
                        {formatDateRange(stop.arrival_date, stop.departure_date) ||
                          "No dates set"}
                      </p>
                      {stop.confirmation_number && (
                        <p className="mt-1 text-sm text-white/60">
                          Confirmation #{stop.confirmation_number}
                        </p>
                      )}
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
            No stops yet. Add your first one above to build the itinerary.
          </p>
        )}
      </section>

      <section className="glass-card enter p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">Packing list</h2>
        <PackingList
          items={packingItems}
          addAction={addPackingItemToTrip}
          toggleAction={togglePackingItemForTrip}
          renameAction={renamePackingItemForTrip}
          deleteAction={deletePackingItemForTrip}
          generateAction={generatePackingSuggestionsForTrip}
        />
      </section>
    </div>
  );
}
