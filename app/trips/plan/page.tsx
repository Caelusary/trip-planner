import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTrip } from "@/actions/trips";
import { SubmitButton } from "@/components/SubmitButton";
import { CityAutocomplete } from "@/components/CityAutocomplete";

export default async function PlanTripPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pt-4">
      {/* No "back to trips" link here — Tourist attractions is now its own
          tab in the top nav (see components/TopNav.tsx). */}
      <h1 className="font-display text-lg font-semibold">Plan a new trip</h1>
      <section className="glass-card enter p-6">
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
