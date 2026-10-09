"use client";

import { useState } from "react";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { SubmitButton } from "@/components/SubmitButton";
import { parseConfirmationText } from "@/lib/confirmationParser";
import { STOP_TYPES, STOP_TYPE_LABEL, type StopType } from "@/lib/stopTypes";

interface AddStopFormProps {
  action: (formData: FormData) => Promise<void>;
}

/**
 * The trip page's "add a stop" form. Fields are controlled (rather than
 * plain uncontrolled inputs) so the confirmation-email paste box can
 * pre-fill them — that's also why submission resets state manually
 * afterward: React only auto-resets *uncontrolled* fields once a form
 * action completes, and controlling these to support the parser opts out
 * of that.
 */
export function AddStopForm({ action }: AddStopFormProps) {
  const [showParser, setShowParser] = useState(false);
  const [parserText, setParserText] = useState("");

  const [city, setCity] = useState("");
  const [cityVersion, setCityVersion] = useState(0);
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [notes, setNotes] = useState("");
  const [stopType, setStopType] = useState<StopType>("activity");
  const [confirmationNumber, setConfirmationNumber] = useState("");

  function handleParse() {
    const parsed = parseConfirmationText(parserText);
    if (parsed.city) {
      setCity(parsed.city);
      // CityAutocomplete only reads `defaultValue` at mount — remounting it
      // (via a changed `key`) is how app/trips/plan/page.tsx already solves
      // this same "externally set a value after the component exists"
      // problem for a pre-filled destination.
      setCityVersion((v) => v + 1);
    }
    if (parsed.arrivalDate) setArrivalDate(parsed.arrivalDate);
    if (parsed.departureDate) setDepartureDate(parsed.departureDate);
    if (parsed.confirmationNumber) setConfirmationNumber(parsed.confirmationNumber);
    if (parsed.stopType) setStopType(parsed.stopType);
  }

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setCity("");
    setCityVersion((v) => v + 1);
    setArrivalDate("");
    setDepartureDate("");
    setNotes("");
    setStopType("activity");
    setConfirmationNumber("");
    setParserText("");
    setShowParser(false);
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setShowParser((v) => !v)}
        className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-white/75 underline underline-offset-4 decoration-white/30 hover:text-white hover:decoration-white/70"
      >
        {showParser ? "Hide" : "Paste a confirmation email instead"}
      </button>

      {showParser && (
        <div className="glass-card flex flex-col gap-2 p-4">
          <p className="text-xs text-white/60">
            Paste flight/hotel/reservation confirmation text below. This is a
            best-effort guess (no AI, just pattern matching), so double-check
            the fields it fills in before adding the stop.
          </p>
          <textarea
            value={parserText}
            onChange={(event) => setParserText(event.target.value)}
            placeholder="Paste confirmation email text here…"
            rows={4}
            className="glass-input w-full px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={!parserText.trim()}
            className="inline-flex min-h-11 items-center self-start rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Parse
          </button>
        </div>
      )}

      <form action={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-2">
          City
          <CityAutocomplete
            key={cityVersion}
            name="city"
            placeholder="e.g. Kyoto"
            required
            defaultValue={city}
            className="glass-input w-full px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70">
          Arrival
          <input
            name="arrival_date"
            type="date"
            value={arrivalDate}
            onChange={(event) => setArrivalDate(event.target.value)}
            className="glass-input px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70">
          Departure
          <input
            name="departure_date"
            type="date"
            value={departureDate}
            onChange={(event) => setDepartureDate(event.target.value)}
            className="glass-input px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70">
          Type
          <select
            name="stop_type"
            value={stopType}
            onChange={(event) => setStopType(event.target.value as StopType)}
            className="glass-input px-3 py-2"
          >
            {STOP_TYPES.map((type) => (
              <option key={type} value={type}>
                {STOP_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70">
          Confirmation # (optional)
          <input
            name="confirmation_number"
            value={confirmationNumber}
            onChange={(event) => setConfirmationNumber(event.target.value)}
            placeholder="e.g. ABC123"
            className="glass-input px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70 sm:col-span-2">
          Notes (optional)
          <input
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Must-sees, seat numbers…"
            className="glass-input px-3 py-2"
          />
        </label>
        <SubmitButton pendingLabel="Adding stop…" className="sm:col-span-2">
          Add stop
        </SubmitButton>
      </form>
    </div>
  );
}
