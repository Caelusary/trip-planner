"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireText, requireUuid } from "@/lib/validation";
import { requireTripOwnership, requireUser, throwSafeDbError } from "@/lib/tripAuth";
import { generatePackingList } from "@/lib/packingList";
import { forecastForDateRange, getForecast } from "@/lib/weather";

async function nextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
): Promise<number> {
  const { data } = await supabase
    .from("packing_items")
    .select("position")
    .eq("trip_id", tripId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

export async function addPackingItem(tripId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  await requireTripOwnership(supabase, tripId, user.id);

  const label = requireText(formData.get("label"), "item");
  const position = await nextPosition(supabase, tripId);

  const { error } = await supabase.from("packing_items").insert({ trip_id: tripId, label, position });
  if (error) throwSafeDbError(error, "add this packing item");

  revalidatePath(`/trips/${tripId}`);
}

export async function togglePackingItem(tripId: string, itemId: string, checked: boolean) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  requireUuid(itemId, "item id");
  await requireTripOwnership(supabase, tripId, user.id);

  const { error } = await supabase
    .from("packing_items")
    .update({ checked })
    .eq("id", itemId)
    .eq("trip_id", tripId);
  if (error) throwSafeDbError(error, "update this packing item");

  revalidatePath(`/trips/${tripId}`);
}

export async function renamePackingItem(tripId: string, itemId: string, label: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  requireUuid(itemId, "item id");
  await requireTripOwnership(supabase, tripId, user.id);

  const cleanLabel = requireText(label, "item");

  const { error } = await supabase
    .from("packing_items")
    .update({ label: cleanLabel })
    .eq("id", itemId)
    .eq("trip_id", tripId);
  if (error) throwSafeDbError(error, "rename this packing item");

  revalidatePath(`/trips/${tripId}`);
}

export async function deletePackingItem(tripId: string, itemId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  requireUuid(itemId, "item id");
  await requireTripOwnership(supabase, tripId, user.id);

  const { error } = await supabase
    .from("packing_items")
    .delete()
    .eq("id", itemId)
    .eq("trip_id", tripId);
  if (error) throwSafeDbError(error, "remove this packing item");

  revalidatePath(`/trips/${tripId}`);
}

/**
 * Generates suggestions from the trip's length + whatever weather forecast
 * is available for its dates, then inserts only the ones not already
 * present (case-insensitive label match) — repeat clicks don't duplicate
 * items the user already has (whether auto-suggested earlier or added by
 * hand).
 */
export async function generatePackingSuggestions(tripId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  requireUuid(tripId, "trip id");
  await requireTripOwnership(supabase, tripId, user.id);

  const { data: trip } = await supabase
    .from("trips")
    .select("start_date, end_date, destination_lat, destination_lon")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) throw new Error("Trip not found.");

  let forecast: Awaited<ReturnType<typeof getForecast>> = [];
  if (trip.destination_lat != null && trip.destination_lon != null) {
    const fullForecast = await getForecast(trip.destination_lat, trip.destination_lon);
    forecast = forecastForDateRange(fullForecast, trip.start_date, trip.end_date);
  }

  const suggestions = generatePackingList(trip.start_date, trip.end_date, forecast);

  const { data: existingItems } = await supabase
    .from("packing_items")
    .select("label")
    .eq("trip_id", tripId);
  const existingLabels = new Set((existingItems ?? []).map((item) => item.label.toLowerCase()));
  const toInsert = suggestions.filter((label) => !existingLabels.has(label.toLowerCase()));

  if (toInsert.length > 0) {
    let position = await nextPosition(supabase, tripId);
    const { error } = await supabase
      .from("packing_items")
      .insert(toInsert.map((label) => ({ trip_id: tripId, label, position: position++ })));
    if (error) throwSafeDbError(error, "add suggested packing items");
  }

  revalidatePath(`/trips/${tripId}`);
}
