import { TripListSkeleton } from "@/components/TripCard";

/**
 * Instant pending UI for client-side navigation into this route — without
 * this, Next has nothing to show until the page component's auth check +
 * Supabase query resolve server-side, which is a multi-hundred-ms-to-2s gap
 * in dev. Mirrors the real page's shell so the swap-in feels seamless.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-lg font-semibold">Upcoming trips</h1>
      </div>
      <TripListSkeleton />
    </div>
  );
}
