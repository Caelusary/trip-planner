import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { createTrip } from "@/actions/trips";
import { SubmitButton } from "@/components/SubmitButton";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { PageHeader } from "@/components/PageHeader";
import { PlanTripPreview } from "@/components/PlanTripPreview";

const FORM_ID = "plan-trip-form";

export default async function PlanTripPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Plan a new trip"
        meta="Start with where and when. Stops, weather and packing come next."
      />
      <div className="grid items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
        <section aria-label="Trip details" className="glass-card enter p-6 sm:p-7">
          <form id={FORM_ID} action={createTrip} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-white/70 sm:col-span-2">
              Trip name
              <input
                name="name"
                placeholder="e.g. Spring in Kyoto"
                required
                maxLength={200}
                className="glass-input px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/70 sm:col-span-2">
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
            <label className="flex flex-col gap-1.5 text-xs text-white/70">
              Start date
              <input name="start_date" type="date" required className="glass-input px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/70">
              End date
              <input name="end_date" type="date" required className="glass-input px-3 py-2" />
            </label>
            <SubmitButton pendingLabel="Creating trip…" className="mt-2 sm:col-span-2">
              Create trip
            </SubmitButton>
          </form>
        </section>
        <PlanTripPreview formId={FORM_ID} />
      </div>
    </div>
  );
}
