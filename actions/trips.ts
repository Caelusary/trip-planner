"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodeCity } from "@/lib/weather";
import { MAX_NOTES_LENGTH, optionalDate, requireDate, requireText, requireUuid } from "@/lib/validation";
import { requireTripOwnership, requireUser, throwSafeDbError } from "@/lib/tripAuth";
import { isStopType, type StopType } from "@/lib/stopTypes";

const MAX_CONFIRMATION_NUMBER_LENGTH = 100;

export async function createTrip(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const name = requireText(formData.get("name"), "trip name");
  const destination = requireText(formData.get("destination"), "destination");
  const startDate = requireDate(formData.get("start_date"), "start date");
  const endDate = requireDate(formData.get("end_date"), "end date");
  if (endDate < startDate) throw new Error("End date must be on or after start date.");

  const geo = await geocodeCity(destination);

  const { error } = await supabase.from("trips").insert({
    user_id: user.id,
    name,
    destination_city: geo?.label ?? destination,
    destination_lat: geo?.lat ?? null,
    destination_lon: geo?.lon ?? null,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) throwSafeDbError(error, "save this trip");

  revalidatePath("/trips");
  revalidatePath("/trips/upcoming");
  redirect("/trips/upcoming");
}

export async function deleteTrip(tripId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  await requireTripOwnership(supabase, tripId, user.id);

  // trip_stops.trip_id has ON DELETE CASCADE (confirmed via pg_constraint),
  // so deleting the trip removes its stops automatically.
  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", user.id);
  if (error) throwSafeDbError(error, "delete this trip");
  revalidatePath("/trips");
  redirect("/trips");
}

interface StopInput {
  city: string;
  arrivalDate: string | null;
  departureDate: string | null;
  notes: string | null;
  stopType: StopType;
  confirmationNumber: string | null;
}

/**
 * Shared by both `addStop` (the trip page's own form, bound to a known
 * tripId) and `addAttractionToTrip` (the Saved page, where the trip is
 * picked from a dropdown at submit time) — the geocode-then-insert-via-RPC
 * sequence is identical either way.
 */
async function insertStop(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  input: StopInput,
) {
  const geo = await geocodeCity(input.city);
  // Atomic RPC (see migration add_trip_stop_atomic_position): computing
  // max(position)+1 and inserting used to be two separate round trips, so
  // two concurrent "add stop" submissions for the same trip could land on
  // the same position. The DB function retries under a unique constraint
  // instead.
  return supabase.rpc("add_trip_stop", {
    p_trip_id: tripId,
    p_city: geo?.label ?? input.city,
    p_lat: geo?.lat ?? null,
    p_lon: geo?.lon ?? null,
    p_arrival_date: input.arrivalDate,
    p_departure_date: input.departureDate,
    p_notes: input.notes,
    p_stop_type: input.stopType,
    p_confirmation_number: input.confirmationNumber,
  });
}

function readOptionalNotes(formData: FormData): string | null {
  const rawNotes = formData.get("notes");
  return typeof rawNotes === "string" && rawNotes.trim()
    ? rawNotes.trim().slice(0, MAX_NOTES_LENGTH)
    : null;
}

function readStopType(formData: FormData): StopType {
  const raw = formData.get("stop_type");
  return typeof raw === "string" && isStopType(raw) ? raw : "activity";
}

function readOptionalConfirmationNumber(formData: FormData): string | null {
  const raw = formData.get("confirmation_number");
  return typeof raw === "string" && raw.trim()
    ? raw.trim().slice(0, MAX_CONFIRMATION_NUMBER_LENGTH)
    : null;
}

export async function addStop(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  await requireTripOwnership(supabase, tripId, user.id);

  const city = requireText(formData.get("city"), "city");
  const arrivalDate = optionalDate(formData.get("arrival_date"), "arrival date");
  const departureDate = optionalDate(formData.get("departure_date"), "departure date");
  if (arrivalDate && departureDate && departureDate < arrivalDate) {
    throw new Error("Departure date must be on or after arrival date.");
  }
  const notes = readOptionalNotes(formData);
  const stopType = readStopType(formData);
  const confirmationNumber = readOptionalConfirmationNumber(formData);

  const { error } = await insertStop(supabase, tripId, {
    city,
    arrivalDate,
    departureDate,
    notes,
    stopType,
    confirmationNumber,
  });
  if (error) throwSafeDbError(error, "add this stop");

  revalidatePath(`/trips/${tripId}`);
}

/**
 * Adds a saved attraction to an existing trip as a stop — the Saved page's
 * "Add to trip" picker, as opposed to `addStop`'s own form on the trip page
 * itself. The target trip is chosen from a `<select>` at submit time, so
 * (unlike `addStop`) the trip id travels inside `formData` rather than as a
 * bound argument.
 */
export async function addAttractionToTrip(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const tripId = requireText(formData.get("trip_id"), "trip");
  requireUuid(tripId, "trip id");
  await requireTripOwnership(supabase, tripId, user.id);

  const city = requireText(formData.get("city"), "city");
  const notes = readOptionalNotes(formData);

  const { error } = await insertStop(supabase, tripId, {
    city,
    arrivalDate: null,
    departureDate: null,
    notes,
    stopType: "activity",
    confirmationNumber: null,
  });
  if (error) throwSafeDbError(error, "add this stop");

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips/saved");
}

export async function deleteStop(tripId: string, stopId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  requireUuid(stopId, "stop id");
  await requireTripOwnership(supabase, tripId, user.id);

  const { error } = await supabase
    .from("trip_stops")
    .delete()
    .eq("id", stopId)
    .eq("trip_id", tripId);
  if (error) throwSafeDbError(error, "remove this stop");
  revalidatePath(`/trips/${tripId}`);
}
