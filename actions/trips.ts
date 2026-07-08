"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodeCity } from "@/lib/weather";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;

function requireText(value: FormDataEntryValue | null, field: string): string {
  if (typeof value !== "string") throw new Error(`Invalid ${field}.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error(`Invalid ${field}.`);
  }
  return trimmed;
}

function requireDate(value: FormDataEntryValue | null, field: string): string {
  if (typeof value !== "string" || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}

function optionalDate(value: FormDataEntryValue | null, field: string): string | null {
  if (value == null || value === "") return null;
  return requireDate(value, field);
}

function requireUuid(value: string, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}

async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
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

  if (error) throw new Error(error.message);

  revalidatePath("/trips");
}

export async function deleteTrip(tripId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  await requireTripOwnership(supabase, tripId, user.id);

  // Delete stops first: there's no migration in this repo to confirm an
  // ON DELETE CASCADE foreign key exists between trip_stops and trips, so
  // without this the trip disappears from the UI but its stops become
  // permanently orphaned rows with no trip to attach to.
  const { error: stopsError } = await supabase.from("trip_stops").delete().eq("trip_id", tripId);
  if (stopsError) throw new Error(stopsError.message);

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
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

  const { data: existingStops } = await supabase
    .from("trip_stops")
    .select("position")
    .eq("trip_id", tripId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existingStops?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("trip_stops").insert({
    trip_id: tripId,
    city: geo?.label ?? city,
    lat: geo?.lat ?? null,
    lon: geo?.lon ?? null,
    arrival_date: arrivalDate,
    departure_date: departureDate,
    notes,
    position: nextPosition,
  });

  if (error) throw new Error(error.message);

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
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
}
