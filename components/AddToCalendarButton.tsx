"use client";

import { buildICS, type ICSEvent } from "@/lib/ics";
import { STOP_TYPE_LABEL, type StopType } from "@/lib/stopTypes";

interface StopForCalendar {
  id: string;
  city: string;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
  stop_type: StopType;
  confirmation_number: string | null;
}

interface AddToCalendarButtonProps {
  tripId: string;
  tripName: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  stops: StopForCalendar[];
}

/**
 * Downloads a .ics file with one all-day event for the trip's own date
 * range plus one per stop that has an arrival date — a hand-rolled ICS
 * rather than a Google Calendar link works with Apple/Outlook/Google alike
 * (a "Add to Google Calendar" link only works for Google).
 */
export function AddToCalendarButton({
  tripId,
  tripName,
  destinationCity,
  startDate,
  endDate,
  stops,
}: AddToCalendarButtonProps) {
  function handleClick() {
    const events: ICSEvent[] = [
      {
        uid: `trip-${tripId}@trip-planner`,
        title: tripName,
        startDate,
        endDate,
        location: destinationCity,
      },
      ...stops
        .filter((stop): stop is StopForCalendar & { arrival_date: string } => stop.arrival_date != null)
        .map((stop) => ({
          uid: `stop-${stop.id}@trip-planner`,
          title: `${STOP_TYPE_LABEL[stop.stop_type]}: ${stop.city}`,
          startDate: stop.arrival_date,
          endDate: stop.departure_date ?? stop.arrival_date,
          location: stop.city,
          description: [
            stop.confirmation_number ? `Confirmation #${stop.confirmation_number}` : null,
            stop.notes,
          ]
            .filter(Boolean)
            .join("\n") || undefined,
        })),
    ];

    const ics = buildICS(tripName, events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const filename = `${tripName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "trip"}.ics`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
    >
      Add to calendar
    </button>
  );
}
