import Link from "next/link";
import { cityCode, formatDateRange, tripCountdownLabel, tripStatus, type TripStatus } from "@/lib/format";

export interface TripCardTrip {
  id: string;
  name: string;
  destination_city: string;
  start_date: string;
  end_date: string;
}

const STATUS_LABEL: Record<TripStatus, string> = {
  ongoing: "Ongoing",
  upcoming: "Upcoming",
  past: "Past",
};

const STATUS_CLASS: Record<TripStatus, string> = {
  ongoing: "border-coral-400/40 bg-coral-400/15 text-coral-400",
  upcoming: "border-accent-400/40 bg-accent-400/15 text-accent-400",
  past: "border-white/15 bg-white/5 text-white/50",
};

export function TripCard({ trip }: { trip: TripCardTrip }) {
  const status = tripStatus(trip.start_date, trip.end_date);
  const countdown = tripCountdownLabel(trip.start_date, trip.end_date);
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
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{trip.name}</p>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${STATUS_CLASS[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="truncate text-sm text-white/60">{trip.destination_city}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] tracking-widest text-white/60 uppercase">Travel dates</p>
          <p className="text-sm text-white/80">{formatDateRange(trip.start_date, trip.end_date)}</p>
          {countdown && <p className="text-accent-400 mt-0.5 text-xs font-medium">{countdown}</p>}
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
