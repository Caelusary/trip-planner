import Link from "next/link";
import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { getCurrentUser } from "@/lib/supabase/user";
import { TopAttractions } from "@/components/TopAttractions";

export default async function TripsPage() {
  // Warm the connection for the carousel's picsum.photos placeholder
  // images — the primary card image is this page's likely LCP element, so
  // this saves DNS+TCP+TLS the same way the trip-detail page's
  // openweathermap.org preconnect does for weather icons.
  preconnect("https://picsum.photos");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pt-4">
      <h1 className="sr-only">Your trips</h1>
      <TopAttractions />
      <Link
        href="/trips/plan"
        className="bg-accent-500 hover:bg-accent-400 text-ink-950 flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition"
      >
        Plan a new trip
      </Link>
    </div>
  );
}
