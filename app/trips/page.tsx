import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { createClient } from "@/lib/supabase/server";
import { createTrip } from "@/actions/trips";
import { SubmitButton } from "@/components/SubmitButton";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { TopAttractions } from "@/components/TopAttractions";

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
    </div>
  );
}
