import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Shared by every trip/stop/packing-item server action (actions/trips.ts,
 * actions/packing.ts) — pulled into a plain module rather than left as
 * private helpers in actions/trips.ts because a "use server" file may only
 * export async functions usable as actions, not general-purpose helpers.
 */
export async function requireUser(supabase: SupabaseServerClient) {
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
export function throwSafeDbError(error: { message: string }, action: string): never {
  console.error(`Supabase error while trying to ${action}:`, error.message);
  throw new Error(`Couldn't ${action}. Please try again.`);
}

/** Throws unless the trip exists and belongs to the given user (defense in depth on top of RLS). */
export async function requireTripOwnership(
  supabase: SupabaseServerClient,
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
