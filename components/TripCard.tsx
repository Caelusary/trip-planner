import Link from "next/link";
import { cityCode, formatDateRange } from "@/lib/format";

export interface TripCardTrip {
  id: string;
  name: string;
  destination_city: string;
  start_date: string;
  end_date: string;
}

export function TripCard({ trip }: { trip: TripCardTrip }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="glass-card glass-card-link flex items-stretch overflow-hidden"
    >
      <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-1 py-4">
        <span className="font-display text-accent-400 text-2xl font-semibold tracking-wide">
          {cityCode(trip.destination_city)}
        </span>
        <span className="text-[10px] tracking-widest text-white/60 uppercase">Destination</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{trip.name}</p>
          <p className="truncate text-sm text-white/60">{trip.destination_city}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] tracking-widest text-white/60 uppercase">Travel dates</p>
          <p className="text-sm text-white/80">{formatDateRange(trip.start_date, trip.end_date)}</p>
        </div>
      </div>
    </Link>
  );
}

export function TripListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass-card h-[76px] animate-pulse" />
      ))}
    </div>
  );
}
