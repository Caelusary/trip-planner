import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/weather";

const MAX_QUERY_LENGTH = 100;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchCities(query);
  // City name -> coordinates is effectively static data (mirrors the 30-day
  // `next: { revalidate }` window on the underlying OpenWeatherMap fetch in
  // lib/weather.ts). Without this header every keystroke-driven autocomplete
  // request — even for a query already answered a second ago — re-hits this
  // route and, cache misses aside, skips any HTTP-level caching entirely.
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=2592000" } },
  );
}
