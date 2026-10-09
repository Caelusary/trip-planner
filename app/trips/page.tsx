import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { getCurrentUser } from "@/lib/supabase/user";
import { TopAttractions } from "@/components/TopAttractions";
import { PageHeader } from "@/components/PageHeader";

export default async function TripsPage() {
  // Warm the connection for the carousel's picsum.photos placeholder
  // images — the primary card image is this page's likely LCP element, so
  // this saves DNS+TCP+TLS the same way the trip-detail page's
  // openweathermap.org preconnect does for weather icons.
  preconnect("https://picsum.photos");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Where to next?"
        meta="Top attractions by country. Save the ones you like, then plan a trip around them."
        action={{ href: "/trips/plan", label: "Plan a new trip" }}
      />
      <TopAttractions />
    </div>
  );
}
