import { TripListSkeleton } from "@/components/TripCard";
import { PageHeader } from "@/components/PageHeader";

/** Instant pending UI for client-side navigation; mirrors the real page. */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader title="Trip history" meta="Everywhere you've been, most recent first." />
      <TripListSkeleton />
    </div>
  );
}
