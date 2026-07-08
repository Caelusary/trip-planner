"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodeCity } from "@/lib/weather";

export async function createTrip(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = formData.get("name") as string;
  const destination = formData.get("destination") as string;
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;

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
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function addStop(tripId: string, formData: FormData) {
  const supabase = await createClient();

  const city = formData.get("city") as string;
  const arrivalDate = (formData.get("arrival_date") as string) || null;
  const departureDate = (formData.get("departure_date") as string) || null;
  const notes = (formData.get("notes") as string) || null;

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
  const { error } = await supabase.from("trip_stops").delete().eq("id", stopId);
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
}
