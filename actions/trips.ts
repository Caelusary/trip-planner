"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodeCity } from "@/lib/weather";
import { MAX_NOTES_LENGTH, optionalDate, requireDate, requireText, requireUuid } from "@/lib/validation";

async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Logs the real Supabase error server-side and throws a generic message in
 * its place — raw Postgres/Supabase error text can leak schema/constraint
 * details, so it must never reach the client-rendered error boundary.
 */
function throwSafeDbError(error: { message: string }, action: string): never {
  console.error(`Supabase error while trying to ${action}:`, error.message);
  throw new Error(`Couldn't ${action}. Please try again.`);
}

/** Throws unless the trip exists and belongs to the given user (defense in depth on top of RLS). */
async function requireTripOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  userId: string,
) {
  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!trip) throw new Error("Trip not found.");
}

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

  const rawNotes = formData.get("notes");
  const notes =
    typeof rawNotes === "string" && rawNotes.trim()
      ? rawNotes.trim().slice(0, MAX_NOTES_LENGTH)
      : null;

  const geo = await geocodeCity(city);

  // Atomic RPC (see migration add_trip_stop_atomic_position): computing
  // max(position)+1 and inserting used to be two separate round trips, so
  // two concurrent "add stop" submissions for the same trip could land on
  // the same position. The DB function retries under a unique constraint
  // instead.
  const { error } = await supabase.rpc("add_trip_stop", {
    p_trip_id: tripId,
    p_city: geo?.label ?? city,
    p_lat: geo?.lat ?? null,
    p_lon: geo?.lon ?? null,
    p_arrival_date: arrivalDate,
    p_departure_date: departureDate,
    p_notes: notes,
  });

  if (error) throwSafeDbError(error, "add this stop");

  revalidatePath(`/trips/${tripId}`);
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
