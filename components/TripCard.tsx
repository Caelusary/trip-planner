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
  past: "Completed",
};

const STATUS_CLASS: Record<TripStatus, string> = {
  ongoing: "border-coral-400/40 bg-coral-400/15 !text-coral-400",
  upcoming: "border-accent-400/40 bg-accent-400/15 !text-accent-400",
  past: "border-white/20 bg-white/5",
};

/** Nights between two YYYY-MM-DD dates (date-only, UTC like the stored columns). */
export function tripNights(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function TripCard({ trip }: { trip: TripCardTrip }) {
  const status = tripStatus(trip.start_date, trip.end_date);
  const countdown = tripCountdownLabel(trip.start_date, trip.end_date);
  const nights = tripNights(trip.start_date, trip.end_date);
  const [city, country] = trip.destination_city.split(",").map((part) => part.trim());
  const countdownNumber = countdown?.match(/^\d+/)?.[0];

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="glass-card glass-card-link flex items-stretch overflow-hidden"
    >
      <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 py-5">
        <span className="font-display text-accent-400 text-[1.75rem] leading-none font-semibold tracking-wide">
          {cityCode(trip.destination_city)}
        </span>
        <span className="ticket-label">{country || "To"}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-display truncate text-lg leading-tight font-semibold">{trip.name}</p>
            <span
              className={`ticket-label shrink-0 rounded-full border px-2 py-0.5 !text-[10px] ${STATUS_CLASS[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-white/70">{city}</p>
        </div>

        <dl className="flex shrink-0 gap-6 sm:text-right">
          <div>
            <dt className="ticket-label">Dates</dt>
            <dd className="ticket-data text-sm text-white/90">
              {formatDateRange(trip.start_date, trip.end_date)}
            </dd>
          </div>
          <div>
            <dt className="ticket-label">Nights</dt>
            <dd className="ticket-data text-sm text-white/90">{nights}</dd>
          </div>
        </dl>
      </div>

      {/* Countdown panel: the number you check every day, given its own
          column on wider screens (phones keep it compact, so it's hidden). */}
      <div className="hidden w-28 shrink-0 flex-col items-center justify-center gap-1 border-l border-white/10 px-3 md:flex">
        {countdown ? (
          <>
            <span className="ticket-data text-accent-400 text-2xl leading-none font-medium">
              {countdownNumber ?? "Today"}
            </span>
            <span className="ticket-label text-center">
              {countdownNumber ? countdown.replace(/^\d+\s*/, "") : countdown}
            </span>
          </>
        ) : (
          <span className="ticket-label text-center">Trip done</span>
        )}
      </div>
    </Link>
  );
}

/** Ticket-shaped placeholders that match TripCard's layout, so nothing jumps on swap. */
export function TripListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading trips">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass-card flex h-[92px] items-stretch overflow-hidden">
          <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-2">
            <span className="skeleton h-6 w-12" />
            <span className="skeleton h-2.5 w-8" />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2 px-5">
            <span className="skeleton h-4 w-2/5" />
            <span className="skeleton h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
