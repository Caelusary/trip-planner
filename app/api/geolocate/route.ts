import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodeCountry } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ country: null }, { status: 400 });
  }

  const country = await reverseGeocodeCountry(lat, lon);
  // Coordinates -> country is effectively static; cache the response itself
  // (mirrors the 30-day revalidate window on the underlying fetch) so a
  // repeat lookup for the same rounded coordinates is served from the
  // browser/CDN cache instead of re-invoking the route.
  return NextResponse.json(
    { country },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=2592000" } },
  );
}
