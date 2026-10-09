"use client";

import { useEffect, useState } from "react";
import { cityCode, formatDateRange } from "@/lib/format";
import { tripNights } from "@/components/TripCard";

interface Draft {
  name: string;
  destination: string;
  start: string;
  end: string;
}

/**
 * The boarding pass you're about to issue, filled in live as the plan
 * form is typed into. Reads the form's own fields on `input` events, so
 * the form stays a plain server-action form with no client state of its
 * own. Decorative duplicate of the form values, so hidden from assistive
 * tech.
 */
export function PlanTripPreview({ formId }: { formId: string }) {
  const [draft, setDraft] = useState<Draft>({ name: "", destination: "", start: "", end: "" });

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const read = () => {
      const data = new FormData(form);
      const get = (key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");
      setDraft({ name: get("name"), destination: get("destination"), start: get("start_date"), end: get("end_date") });
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [formId]);

  const hasDates = draft.start && draft.end && draft.end >= draft.start;
  const nights = hasDates ? tripNights(draft.start, draft.end) : null;
  const [city, country] = draft.destination.split(",").map((part) => part.trim());

  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <p className="ticket-label">Your pass</p>
      <div className="glass-card flex items-stretch overflow-hidden">
        <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 py-6">
          <span
            className={`font-display text-[1.75rem] leading-none font-semibold tracking-wide ${
              city ? "text-accent-400" : "text-white/25"
            }`}
          >
            {city ? cityCode(draft.destination) : "???"}
          </span>
          <span className="ticket-label">{country || "To"}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 px-5 py-5">
          <div className="min-w-0">
            <p className={`font-display truncate text-lg leading-tight font-semibold ${draft.name ? "" : "text-white/60"}`}>
              {draft.name || "Name your trip"}
            </p>
            <p className="truncate text-sm text-white/70">{city || "Destination"}</p>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-0.5">
            <p className="ticket-label">Dates</p>
            <p className="ticket-label">Nights</p>
            <p className="ticket-data truncate text-sm text-white/90">
              {hasDates ? formatDateRange(draft.start, draft.end) : "Pick dates"}
            </p>
            <p className="ticket-data text-sm text-white/90">{nights ?? "-"}</p>
          </div>
        </div>
      </div>
      <ul className="flex flex-col gap-2 pt-2 text-sm text-white/70">
        <li className="flex gap-3"><span className="ticket-data text-accent-400">01</span>Add stops, flights and stays</li>
        <li className="flex gap-3"><span className="ticket-data text-accent-400">02</span>Check the forecast for your dates</li>
        <li className="flex gap-3"><span className="ticket-data text-accent-400">03</span>Pack, print the pass, or share a link</li>
      </ul>
    </div>
  );
}
