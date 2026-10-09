import { TripListSkeleton } from "@/components/TripCard";
import { PageHeader } from "@/components/PageHeader";

/**
 * Instant pending UI for client-side navigation into this route. Mirrors
 * the real page's header and ticket cards so the swap-in doesn't jump.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader title="Upcoming trips" meta="Your next departures, soonest first." />
      <TripListSkeleton />
    </div>
  );
}
